/**
 * Branch Inventory Sync Script
 * 
 * Syncs branch inventory Excel files from SharePoint to Neon PostgreSQL.
 * Currently configured for Central Kitchen only.
 * 
 * Required environment variables:
 * - SHAREPOINT_TENANT_ID
 * - SHAREPOINT_CLIENT_ID
 * - SHAREPOINT_CLIENT_SECRET
 * - SHAREPOINT_DRIVE_ID
 * - SHAREPOINT_BRANCH_CK_FILE_ID
 * - DATABASE_URL (Neon PostgreSQL connection string)
 */

// Load .env.local for local development
require('dotenv').config({ path: '.env.local' });

const XLSX = require('xlsx');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws;

// File configurations for branch inventory
const FILE_CONFIGS = {
  central_kitchen: {
    fileIdEnv: 'SHAREPOINT_BRANCH_CK_FILE_ID',
    tableName: 'branch_inventory',
    fileName: 'Branch_Daily_Closing Central_Kitchen.xlsx',
    sheetName: 'Inventory',  // The specific sheet containing inventory data (capital I)
    branch: 'Central Kitchen',
    columns: [
      'inventory_date', 'branch', 'item', 'category', 'quantity',
      'unit', 'product_expiry_date', 'unit_cost', 'total_cost', 'source_file'
    ],
    // Transform Excel row to database format
    transform: (row) => {
      const transformed = {
        inventory_date: parseDate(row['Inventory Date']),
        branch: 'Central Kitchen',  // Hardcoded for this file
        item: row['Item'] ? String(row['Item']).trim() : null,
        category: row['Category'] ? String(row['Category']).trim() : null,
        quantity: parseFloat(row['Quantity']) || 0,
        unit: row['Unit'] ? String(row['Unit']).trim() : null,
        product_expiry_date: parseDate(row['Product Expiry Date']),
        unit_cost: parseFloat(row['Unit Cost']) || 0,
        total_cost: parseFloat(row['Total Cost']) || 0,
        source_file: 'Branch_Daily_Closing Central_Kitchen.xlsx',
      };
      
      // Skip rows without essential data
      if (!transformed.inventory_date || !transformed.item) {
        return null;
      }
      
      // Validate cost calculation (warn if mismatch but still process)
      if (transformed.quantity && transformed.unit_cost && transformed.total_cost) {
        const calculatedTotal = transformed.quantity * transformed.unit_cost;
        const diff = Math.abs(calculatedTotal - transformed.total_cost);
        if (diff > 0.01) {
          console.warn(`   ⚠️  Cost mismatch for "${transformed.item}": calculated ${calculatedTotal.toFixed(2)}, got ${transformed.total_cost.toFixed(2)}`);
        }
      }
      
      return transformed;
    },
  },
};

// Configuration from environment
const config = {
  sharepoint: {
    tenantId: process.env.SHAREPOINT_TENANT_ID,
    clientId: process.env.SHAREPOINT_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
    driveId: process.env.SHAREPOINT_DRIVE_ID,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
};

// Database pool
let pool;

// Helper function to parse dates from Excel
function parseDate(value) {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // String date
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  
  // Excel serial date number
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  
  return null;
}

// Escape SQL values for safe insertion
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return isNaN(value) ? '0' : String(value);
  }
  if (typeof value === 'string') {
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }
  return 'NULL';
}

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!config.sharepoint.tenantId) missing.push('SHAREPOINT_TENANT_ID');
  if (!config.sharepoint.clientId) missing.push('SHAREPOINT_CLIENT_ID');
  if (!config.sharepoint.clientSecret) missing.push('SHAREPOINT_CLIENT_SECRET');
  if (!config.sharepoint.driveId) missing.push('SHAREPOINT_DRIVE_ID');
  if (!config.database.url) missing.push('DATABASE_URL');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Initialize database connection
function initDatabase() {
  pool = new Pool({ connectionString: config.database.url });
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

// Get Microsoft Graph API access token
async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${config.sharepoint.tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.sharepoint.clientId,
      client_secret: config.sharepoint.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Download Excel file from SharePoint
async function downloadFile(accessToken, fileId, fileName) {
  console.log(`   📥 Downloading ${fileName}...`);
  
  const url = `https://graph.microsoft.com/v1.0/drives/${config.sharepoint.driveId}/items/${fileId}/content`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Download failed: ${response.status} - ${errorText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`   ✓ Downloaded ${sizeMB} MB`);
  
  return arrayBuffer;
}

// Parse Excel file and extract specific sheet
function parseExcel(buffer, sheetName) {
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    cellDates: true,  // Parse dates as Date objects
  });
  
  console.log(`   📊 Available sheets: ${workbook.SheetNames.join(', ')}`);
  
  // Check if the specified sheet exists
  if (!workbook.Sheets[sheetName]) {
    throw new Error(`Sheet "${sheetName}" not found! Available sheets: ${workbook.SheetNames.join(', ')}`);
  }
  
  const sheet = workbook.Sheets[sheetName];
  
  // Header is in row 2 (index 1), so start reading from there
  const data = XLSX.utils.sheet_to_json(sheet, { 
    defval: null,
    range: 1  // Start from row 2 (0-indexed, so 1 = row 2)
  });
  
  return data;
}

// Build bulk UPSERT query
function buildBulkUpsertQuery(tableName, columns, rows, transformFn) {
  // Transform and filter rows
  const transformedRows = rows
    .map(transformFn)
    .filter(row => row !== null);  // Remove invalid rows
  
  if (transformedRows.length === 0) {
    return null;
  }
  
  // Deduplicate based on unique constraint (inventory_date, branch, item)
  // Keep the last occurrence of each duplicate
  const uniqueRows = [];
  const seen = new Map();
  
  for (const row of transformedRows) {
    const key = `${row.inventory_date}|${row.branch}|${row.item}`;
    seen.set(key, row);  // This will overwrite duplicates, keeping the last one
  }
  
  uniqueRows.push(...seen.values());
  
  if (uniqueRows.length === 0) {
    return null;
  }
  
  // Build value rows for SQL
  const valueRows = uniqueRows.map(row => {
    const values = columns.map(col => escapeSqlValue(row[col]));
    return `(${values.join(', ')})`;
  });
  
  // UPSERT query - insert new records or update existing ones
  return `
    INSERT INTO ${tableName} (${columns.join(', ')}) 
    VALUES ${valueRows.join(', ')}
    ON CONFLICT (inventory_date, branch, item) 
    DO UPDATE SET
      category = EXCLUDED.category,
      quantity = EXCLUDED.quantity,
      unit = EXCLUDED.unit,
      product_expiry_date = EXCLUDED.product_expiry_date,
      unit_cost = EXCLUDED.unit_cost,
      total_cost = EXCLUDED.total_cost,
      source_file = EXCLUDED.source_file,
      last_synced = CURRENT_TIMESTAMP
  `;
}

// Sync a single inventory file
async function syncFile(accessToken, fileKey) {
  const fileConfig = FILE_CONFIGS[fileKey];
  const fileId = process.env[fileConfig.fileIdEnv];
  
  if (!fileId) {
    console.log(`   ⚠️  Skipping ${fileKey}: ${fileConfig.fileIdEnv} not set`);
    return { file: fileKey, status: 'skipped', reason: 'No file ID configured' };
  }
  
  console.log(`\n📁 Syncing ${fileConfig.fileName}...`);
  console.log(`   Branch: ${fileConfig.branch}`);
  console.log(`   Sheet: ${fileConfig.sheetName}`);
  
  const startTime = Date.now();
  
  try {
    // Step 1: Download file from SharePoint
    const buffer = await downloadFile(accessToken, fileId, fileConfig.fileName);
    
    // Step 2: Parse Excel file (specific sheet)
    console.log(`   📊 Parsing sheet "${fileConfig.sheetName}"...`);
    const rows = parseExcel(buffer, fileConfig.sheetName);
    console.log(`   ✓ Parsed ${rows.length.toLocaleString()} rows from sheet`);
    
    // Show sample row for debugging
    if (rows.length > 0) {
      const sampleCols = Object.keys(rows[0]).slice(0, 5);
      console.log(`   Sample columns: ${sampleCols.join(', ')}${Object.keys(rows[0]).length > 5 ? ', ...' : ''}`);
    }
    
    // Step 3: Log sync start in database
    await pool.query(
      `INSERT INTO sync_logs (file_name, started_at, status, rows_processed)
       VALUES ($1, NOW(), 'running', 0)`,
      [fileConfig.fileName]
    );
    
    // Step 4: Insert/update data in batches
    console.log(`   🗄️  Syncing to database (UPSERT mode)...`);
    
    const BATCH_SIZE = 1000;
    let processed = 0;
    let validRows = 0;
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const query = buildBulkUpsertQuery(
        fileConfig.tableName,
        fileConfig.columns,
        batch,
        fileConfig.transform
      );
      
      if (query) {
        await pool.query(query);
        // Count valid rows (non-null after transform)
        const validInBatch = batch.map(fileConfig.transform).filter(r => r !== null).length;
        validRows += validInBatch;
      }
      
      processed += batch.length;
      
      // Progress update
      if (processed % 5000 === 0 || i + BATCH_SIZE >= rows.length) {
        const pct = ((processed / rows.length) * 100).toFixed(1);
        console.log(`   Progress: ${processed.toLocaleString()} / ${rows.length.toLocaleString()} (${pct}%)`);
      }
    }
    
    // Step 5: Log success
    await pool.query(
      `UPDATE sync_logs SET completed_at = NOW(), status = 'success', rows_processed = $1
       WHERE file_name = $2 AND status = 'running'`,
      [validRows, fileConfig.fileName]
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ ${fileConfig.fileName}: ${validRows.toLocaleString()} valid rows synced in ${duration}s`);
    
    if (validRows < processed) {
      console.log(`   ℹ️  Skipped ${processed - validRows} invalid rows`);
    }
    
    return { 
      file: fileKey, 
      status: 'success', 
      rows: validRows, 
      skipped: processed - validRows,
      duration: parseFloat(duration) 
    };
    
  } catch (error) {
    // Log failure
    await pool.query(
      `UPDATE sync_logs SET completed_at = NOW(), status = 'failed', error_message = $1
       WHERE file_name = $2 AND status = 'running'`,
      [error.message, fileConfig.fileName]
    ).catch(() => {});
    
    console.log(`   ❌ ${fileConfig.fileName}: ${error.message}`);
    return { file: fileKey, status: 'failed', error: error.message };
  }
}

// Main sync function
async function main() {
  console.log('═'.repeat(70));
  console.log('🏪 BRANCH INVENTORY SYNC - CENTRAL KITCHEN');
  console.log('═'.repeat(70));
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Validate environment variables
    validateConfig();
    
    // Initialize database connection
    initDatabase();
    
    console.log('🔑 Authenticating with Microsoft Graph API...');
    const accessToken = await getAccessToken();
    console.log('✅ Authentication successful');
    
    // Sync Central Kitchen inventory file
    const result = await syncFile(accessToken, 'central_kitchen');
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(70));
    console.log(`   File: ${FILE_CONFIGS.central_kitchen.fileName}`);
    console.log(`   Status: ${result.status}`);
    if (result.rows !== undefined) {
      console.log(`   Rows synced: ${result.rows.toLocaleString()}`);
    }
    if (result.skipped) {
      console.log(`   Rows skipped: ${result.skipped.toLocaleString()}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log(`   Total duration: ${duration} seconds`);
    console.log(`   Completed: ${new Date().toISOString()}`);
    console.log('═'.repeat(70));
    
    if (result.status === 'failed') {
      process.exit(1);
    }
    
  } catch (error) {
    console.log('\n' + '═'.repeat(70));
    console.log('❌ SYNC FAILED');
    console.log('═'.repeat(70));
    console.log(`   Error: ${error.message}`);
    console.log(`   Duration: ${((Date.now() - startTime) / 1000).toFixed(1)} seconds`);
    console.log('═'.repeat(70));
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run the sync
main();
