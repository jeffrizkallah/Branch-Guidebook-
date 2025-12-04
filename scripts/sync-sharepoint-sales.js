/**
 * SharePoint to Neon PostgreSQL Sales Sync Script
 * 
 * This script downloads the sales.xlsx file from SharePoint and syncs it to Neon.
 * Designed to run as a GitHub Action on a daily schedule.
 * 
 * Required environment variables:
 * - SHAREPOINT_TENANT_ID
 * - SHAREPOINT_CLIENT_ID
 * - SHAREPOINT_CLIENT_SECRET
 * - SHAREPOINT_DRIVE_ID
 * - SHAREPOINT_SALES_FILE_ID
 * - DATABASE_URL (Neon PostgreSQL connection string)
 * - DRY_RUN (optional, 'true' to skip database writes)
 */

// Load .env.local for local development
require('dotenv').config({ path: '.env.local' });

const XLSX = require('xlsx');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws;

// Configuration from environment
const config = {
  sharepoint: {
    tenantId: process.env.SHAREPOINT_TENANT_ID,
    clientId: process.env.SHAREPOINT_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
    driveId: process.env.SHAREPOINT_DRIVE_ID,
    salesFileId: process.env.SHAREPOINT_SALES_FILE_ID,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  dryRun: process.env.DRY_RUN === 'true',
};

// Validate configuration
function validateConfig() {
  const missing = [];
  
  if (!config.sharepoint.tenantId) missing.push('SHAREPOINT_TENANT_ID');
  if (!config.sharepoint.clientId) missing.push('SHAREPOINT_CLIENT_ID');
  if (!config.sharepoint.clientSecret) missing.push('SHAREPOINT_CLIENT_SECRET');
  if (!config.sharepoint.driveId) missing.push('SHAREPOINT_DRIVE_ID');
  if (!config.sharepoint.salesFileId) missing.push('SHAREPOINT_SALES_FILE_ID');
  if (!config.database.url) missing.push('DATABASE_URL');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Database pool
let pool;
function initDatabase() {
  pool = new Pool({ connectionString: config.database.url });
}

// Helper to run queries
async function sql(strings, ...values) {
  // Support both tagged template and direct query
  if (Array.isArray(strings) && strings.raw) {
    // Tagged template literal
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}` + strings[i + 1];
    }
    return pool.query(query, values);
  }
  // Direct query string
  return pool.query(strings);
}

// Run raw SQL query
async function rawQuery(queryString) {
  return pool.query(queryString);
}

/**
 * Get Microsoft Graph API access token using client credentials flow
 */
async function getAccessToken() {
  console.log('🔑 Authenticating with Microsoft Graph API...');
  
  const tokenUrl = `https://login.microsoftonline.com/${config.sharepoint.tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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
  console.log('✅ Authentication successful');
  return data.access_token;
}

/**
 * Download Excel file from SharePoint using Microsoft Graph API
 */
async function downloadExcelFile(accessToken) {
  console.log('📥 Downloading sales.xlsx from SharePoint...');
  
  const url = `https://graph.microsoft.com/v1.0/drives/${config.sharepoint.driveId}/items/${config.sharepoint.salesFileId}/content`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Download failed: ${response.status} - ${errorText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`✅ Downloaded ${sizeMB} MB`);
  
  return arrayBuffer;
}

/**
 * Parse Excel file and extract data
 */
function parseExcelFile(buffer) {
  console.log('📊 Parsing Excel file...');
  
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    cellDates: true,  // Parse dates as Date objects
    cellNF: false,    // Don't parse number formats
    cellText: false,  // Don't generate text
  });
  
  const sheetName = workbook.SheetNames[0];
  console.log(`   Sheet name: "${sheetName}"`);
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, {
    defval: null,  // Default value for empty cells
  });
  
  console.log(`✅ Parsed ${data.length.toLocaleString()} rows`);
  
  // Show sample of first row for debugging
  if (data.length > 0) {
    console.log('   Sample columns:', Object.keys(data[0]).slice(0, 5).join(', '), '...');
  }
  
  return data;
}

/**
 * Transform a row from Excel format to database format
 */
function transformRow(row) {
  // Parse date - handle various formats
  let parsedDate = null;
  if (row['Date']) {
    if (row['Date'] instanceof Date) {
      parsedDate = row['Date'].toISOString().split('T')[0];
    } else if (typeof row['Date'] === 'string') {
      // Try to parse string date
      const d = new Date(row['Date']);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString().split('T')[0];
      }
    } else if (typeof row['Date'] === 'number') {
      // Excel serial date number
      const d = XLSX.SSF.parse_date_code(row['Date']);
      if (d) {
        parsedDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      }
    }
  }
  
  return {
    order_number: row['Order Number'] ? String(row['Order Number']).trim() : null,
    order_type: row['Order Type'] ? String(row['Order Type']).trim() : null,
    branch: row['Branch'] ? String(row['Branch']).trim() : null,
    date: parsedDate,
    client: row['Client'] ? String(row['Client']).trim() : null,
    items: row['Items'] ? String(row['Items']).trim() : null,
    qty: parseFloat(row['Qty']) || 0,
    unit_of_measure: row['Unit of Measure'] ? String(row['Unit of Measure']).trim() : null,
    unit_price: parseFloat(row['Unit Price']) || 0,
    price_subtotal: parseFloat(row['Price subtotal']) || 0,
    price_subtotal_with_tax: parseFloat(row['Price subtotal with tax']) || 0,
    invoice_number: row['Invoice number'] ? String(row['Invoice number']).trim() : null,
    month: row['Month'] ? String(row['Month']).trim() : null,
    tax: parseFloat(row['Tax']) || 0,
    category: row['Category'] ? String(row['Category']).trim() : null,
    product_group: row['Group'] ? String(row['Group']).trim() : null,
    barcode: row['Barcode'] ? String(row['Barcode']).trim() : null,
  };
}

/**
 * Log the start of a sync operation
 */
async function logSyncStart() {
  if (config.dryRun) return null;
  
  const result = await pool.query(
    `INSERT INTO sync_logs (file_name, started_at, status, rows_processed)
     VALUES ('sales.xlsx', NOW(), 'running', 0)
     RETURNING id`
  );
  return result.rows[0]?.id;
}

/**
 * Update sync log with completion status
 */
async function logSyncComplete(syncId, rowsProcessed, status, errorMessage = null) {
  if (config.dryRun || !syncId) return;
  
  await pool.query(
    `UPDATE sync_logs 
     SET completed_at = NOW(), status = $1, rows_processed = $2, error_message = $3
     WHERE id = $4`,
    [status, rowsProcessed, errorMessage, syncId]
  );
}

/**
 * Close database connections
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

/**
 * Escape a value for SQL insertion
 */
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

/**
 * Build a bulk INSERT query for a batch of rows
 */
function buildBulkInsertQuery(transformedRows) {
  const columns = [
    'order_number', 'order_type', 'branch', 'date', 'client', 'items',
    'qty', 'unit_of_measure', 'unit_price', 'price_subtotal',
    'price_subtotal_with_tax', 'invoice_number', 'month', 'tax',
    'category', 'product_group', 'barcode'
  ];
  
  const valueRows = transformedRows.map(row => {
    const values = [
      escapeSqlValue(row.order_number),
      escapeSqlValue(row.order_type),
      escapeSqlValue(row.branch),
      escapeSqlValue(row.date),
      escapeSqlValue(row.client),
      escapeSqlValue(row.items),
      escapeSqlValue(row.qty),
      escapeSqlValue(row.unit_of_measure),
      escapeSqlValue(row.unit_price),
      escapeSqlValue(row.price_subtotal),
      escapeSqlValue(row.price_subtotal_with_tax),
      escapeSqlValue(row.invoice_number),
      escapeSqlValue(row.month),
      escapeSqlValue(row.tax),
      escapeSqlValue(row.category),
      escapeSqlValue(row.product_group),
      escapeSqlValue(row.barcode),
    ];
    return `(${values.join(', ')})`;
  });
  
  return `INSERT INTO odoo_sales (${columns.join(', ')}) VALUES ${valueRows.join(', ')}`;
}

/**
 * Sync data to database using BULK inserts (much faster!)
 */
async function syncToDatabase(rows) {
  console.log('🗄️  Syncing to database...');
  
  if (config.dryRun) {
    console.log('   ⚠️  DRY RUN MODE - No database changes will be made');
    console.log(`   Would process ${rows.length.toLocaleString()} rows`);
    return rows.length;
  }
  
  const syncId = await logSyncStart();
  
  try {
    // Step 1: Truncate existing data (full refresh strategy)
    console.log('   Clearing existing data...');
    await rawQuery('TRUNCATE TABLE odoo_sales');
    
    // Step 2: Transform all rows first
    console.log('   Transforming rows...');
    const transformedRows = rows.map(transformRow);
    
    // Step 3: Insert data in large batches using bulk INSERT
    const BATCH_SIZE = 1000;  // 1000 rows per INSERT query
    let processed = 0;
    let batchCount = 0;
    const totalBatches = Math.ceil(transformedRows.length / BATCH_SIZE);
    
    console.log(`   Inserting ${rows.length.toLocaleString()} rows in ${totalBatches} batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
      const batch = transformedRows.slice(i, i + BATCH_SIZE);
      batchCount++;
      
      try {
        // Build and execute bulk INSERT
        const bulkQuery = buildBulkInsertQuery(batch);
        await rawQuery(bulkQuery);
        processed += batch.length;
        
        // Progress update every 10 batches or at the end
        if (batchCount % 10 === 0 || i + BATCH_SIZE >= transformedRows.length) {
          const percent = ((processed / rows.length) * 100).toFixed(1);
          console.log(`   Progress: ${processed.toLocaleString()} / ${rows.length.toLocaleString()} (${percent}%) - Batch ${batchCount}/${totalBatches}`);
        }
      } catch (error) {
        console.error(`   ⚠️  Batch ${batchCount} error: ${error.message}`);
        // Try to continue with remaining batches
      }
    }
    
    // Log success
    await logSyncComplete(syncId, processed, 'success');
    
    console.log(`✅ Sync complete: ${processed.toLocaleString()} rows inserted`);
    
    return processed;
    
  } catch (error) {
    // Log failure
    await logSyncComplete(syncId, 0, 'failed', error.message);
    throw error;
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 ODOO SALES SYNC');
  console.log('═'.repeat(60));
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log(`   Dry Run: ${config.dryRun}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Validate configuration
    validateConfig();
    
    // Initialize database
    initDatabase();
    
    // Step 1: Authenticate with Microsoft Graph
    const accessToken = await getAccessToken();
    
    // Step 2: Download Excel file
    const excelBuffer = await downloadExcelFile(accessToken);
    
    // Step 3: Parse Excel file
    const rows = parseExcelFile(excelBuffer);
    
    // Step 4: Sync to database
    const processedCount = await syncToDatabase(rows);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('═'.repeat(60));
    console.log('✨ SYNC COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log(`   Rows processed: ${processedCount.toLocaleString()}`);
    console.log(`   Duration: ${duration} seconds`);
    console.log(`   Completed: ${new Date().toISOString()}`);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('═'.repeat(60));
    console.log('❌ SYNC FAILED');
    console.log('═'.repeat(60));
    console.log(`   Error: ${error.message}`);
    console.log(`   Duration: ${duration} seconds`);
    console.log(`   Failed at: ${new Date().toISOString()}`);
    
    await closeDatabase();
    process.exit(1);
  }
  
  // Clean up
  await closeDatabase();
}

// Run the sync
main();

