/**
 * SharePoint to Neon PostgreSQL Multi-File Sync Script
 * 
 * Syncs multiple Odoo Excel files from SharePoint to Neon PostgreSQL.
 * Designed to run as a GitHub Action on a daily schedule.
 * 
 * Required environment variables:
 * - SHAREPOINT_TENANT_ID
 * - SHAREPOINT_CLIENT_ID
 * - SHAREPOINT_CLIENT_SECRET
 * - SHAREPOINT_DRIVE_ID
 * - SHAREPOINT_SALES_FILE_ID
 * - SHAREPOINT_INVENTORY_FILE_ID
 * - SHAREPOINT_MANUFACTURING_FILE_ID
 * - SHAREPOINT_PURCHASE_FILE_ID
 * - SHAREPOINT_RECIPE_FILE_ID
 * - SHAREPOINT_TRANSFER_FILE_ID
 * - SHAREPOINT_WASTE_FILE_ID
 * - DATABASE_URL (Neon PostgreSQL connection string)
 * - SYNC_FILES (optional, comma-separated list of files to sync: sales,inventory,manufacturing,purchase,recipe,transfer,waste)
 */

// Load .env.local for local development
require('dotenv').config({ path: '.env.local' });

const XLSX = require('xlsx');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws;

// File configurations
const FILE_CONFIGS = {
  sales: {
    fileIdEnv: 'SHAREPOINT_SALES_FILE_ID',
    tableName: 'odoo_sales',
    fileName: 'sales.xlsx',
    columns: [
      'order_number', 'order_type', 'branch', 'date', 'client', 'items',
      'qty', 'unit_of_measure', 'unit_price', 'price_subtotal',
      'price_subtotal_with_tax', 'invoice_number', 'month', 'tax',
      'category', 'product_group', 'barcode'
    ],
    transform: (row) => ({
      order_number: row['Order Number'] ? String(row['Order Number']).trim() : null,
      order_type: row['Order Type'] ? String(row['Order Type']).trim() : null,
      branch: row['Branch'] ? String(row['Branch']).trim() : null,
      date: parseDate(row['Date']),
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
    }),
  },
  inventory: {
    fileIdEnv: 'SHAREPOINT_INVENTORY_FILE_ID',
    tableName: 'odoo_inventory',
    fileName: 'inventory.xlsx',
    columns: [
      'product', 'location', 'lot_serial', 'number', 'removal_date',
      'inventoried_quantity', 'available_quantity', 'unit_of_measure',
      'value', 'company', 'date'
    ],
    transform: (row) => ({
      product: row['Product'] ? String(row['Product']).trim() : null,
      location: row['Location'] ? String(row['Location']).trim() : null,
      lot_serial: row['Lot/Serial'] ? String(row['Lot/Serial']).trim() : null,
      number: row['Number'] ? String(row['Number']).trim() : null,
      removal_date: parseDate(row['Removal Date']),
      inventoried_quantity: parseFloat(row['Inventoried Quantity']) || 0,
      available_quantity: parseFloat(row['Available Quantity']) || 0,
      unit_of_measure: row['Unit of Measure'] ? String(row['Unit of Measure']).trim() : null,
      value: parseFloat(row['Value']) || 0,
      company: row['Company'] ? String(row['Company']).trim() : null,
      date: parseDate(row['Date']),
    }),
  },
  manufacturing: {
    fileIdEnv: 'SHAREPOINT_MANUFACTURING_FILE_ID',
    tableName: 'odoo_manufacturing',
    fileName: 'manufacturing.xlsx',
    columns: [
      'scheduled_date', 'reference', 'product', 'product_unit_of_measure',
      'quantity_to_produce', 'company', 'state', 'barcode'
    ],
    transform: (row) => ({
      scheduled_date: parseDate(row['Scheduled Date']),
      reference: row['Reference'] ? String(row['Reference']).trim() : null,
      product: row['Product'] ? String(row['Product']).trim() : null,
      product_unit_of_measure: row['Product Unit of Measure'] ? String(row['Product Unit of Measure']).trim() : null,
      quantity_to_produce: parseFloat(row['Quantity To Produce']) || 0,
      company: row['Company'] ? String(row['Company']).trim() : null,
      state: row['State'] ? String(row['State']).trim() : null,
      barcode: row['Barcode'] ? String(row['Barcode']).trim() : null,
    }),
  },
  purchase: {
    fileIdEnv: 'SHAREPOINT_PURCHASE_FILE_ID',
    tableName: 'odoo_purchase',
    fileName: 'purchase.xlsx',
    columns: [
      'purchase_date', 'branch', 'items', 'categories', 'supplier',
      'qty_purchased', 'purchase_unit', 'cost', 'total', 'check_number',
      'vat', 'month', 'barcode'
    ],
    transform: (row) => ({
      purchase_date: parseDate(row['Purchase Date']),
      branch: row['Branch'] ? String(row['Branch']).trim() : null,
      items: row['Items'] ? String(row['Items']).trim() : null,
      categories: row['Categories'] ? String(row['Categories']).trim() : null,
      supplier: row['Supplier'] ? String(row['Supplier']).trim() : null,
      qty_purchased: parseFloat(row['Qty Purchased']) || 0,
      purchase_unit: row['Purchase Unit'] ? String(row['Purchase Unit']).trim() : null,
      cost: parseFloat(row['Cost']) || 0,
      total: parseFloat(row['Total']) || 0,
      check_number: row['Check #'] ? String(row['Check #']).trim() : null,
      vat: parseFloat(row['VAT']) || 0,
      month: row['Month'] ? String(row['Month']).trim() : null,
      barcode: row['Barcode'] ? String(row['Barcode']).trim() : null,
    }),
  },
  recipe: {
    fileIdEnv: 'SHAREPOINT_RECIPE_FILE_ID',
    tableName: 'odoo_recipe',
    fileName: 'recipe.xlsx',
    columns: [
      'category', 'product_group', 'item', 'ingredient_name', 'quantity', 'unit',
      'unit_cost', 'ingredient_total_cost', 'recipe_total_cost', 'notes', 'barcode'
    ],
    transform: (row) => ({
      category: row['Category'] ? String(row['Category']).trim() : null,
      product_group: row['Group'] ? String(row['Group']).trim() : null,
      item: row['Item'] ? String(row['Item']).trim() : null,
      ingredient_name: row['Ingredient Name'] ? String(row['Ingredient Name']).trim() : null,
      quantity: parseFloat(row['Qty']) || 0,
      unit: row['Unit'] ? String(row['Unit']).trim() : null,
      unit_cost: parseFloat(row['Unit Cost']) || 0,
      ingredient_total_cost: parseFloat(row['Ingredient Total Cost']) || 0,
      recipe_total_cost: parseFloat(row['Recipe Total Cost']) || 0,
      notes: row['Notes'] ? String(row['Notes']).trim() : null,
      barcode: row['Barcode'] ? String(row['Barcode']).trim() : null,
    }),
  },
  transfer: {
    fileIdEnv: 'SHAREPOINT_TRANSFER_FILE_ID',
    tableName: 'odoo_transfer',
    fileName: 'transfer.xlsx',
    columns: [
      'effective_date', 'scheduled_date', 'from_branch', 'to_branch',
      'items', 'category', 'product_group', 'quantity', 'cost', 'barcode'
    ],
    transform: (row) => ({
      effective_date: parseDate(row['Effective Date']),
      scheduled_date: parseDate(row['Scheduled Date']),
      from_branch: row['From Branch'] ? String(row['From Branch']).trim() : null,
      to_branch: row['To Branch'] ? String(row['To Branch']).trim() : null,
      items: row['Items'] ? String(row['Items']).trim() : null,
      category: row['Category'] ? String(row['Category']).trim() : null,
      product_group: row['Group'] ? String(row['Group']).trim() : null,
      quantity: parseFloat(row['Quantity']) || 0,
      cost: parseFloat(row['Cost']) || 0,
      barcode: row['Barcode'] ? String(row['Barcode']).trim() : null,
    }),
  },
  waste: {
    fileIdEnv: 'SHAREPOINT_WASTE_FILE_ID',
    tableName: 'odoo_waste',
    fileName: 'waste.xlsx',
    columns: [
      'date', 'branch', 'item', 'category', 'product_group',
      'quantity', 'unit', 'cost', 'reason', 'barcode'
    ],
    transform: (row) => ({
      date: parseDate(row['Date']),
      branch: row['Branch'] ? String(row['Branch']).trim() : null,
      item: row['Item'] ? String(row['Item']).trim() : null,
      category: row['Category'] ? String(row['Category']).trim() : null,
      product_group: row['Group'] ? String(row['Group']).trim() : null,
      quantity: parseFloat(row['Quantity']) || 0,
      unit: row['Unit'] ? String(row['Unit']).trim() : null,
      cost: parseFloat(row['Cost']) || 0,
      reason: row['Reason'] ? String(row['Reason']).trim() : null,
      barcode: row['Barcode'] ? String(row['Barcode']).trim() : null,
    }),
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
  filesToSync: (process.env.SYNC_FILES || 'sales,inventory,manufacturing,purchase,recipe,transfer,waste').split(',').map(s => s.trim()),
};

// Database pool
let pool;

// Helper function to parse dates
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  if (typeof value === 'number') {
    // Excel serial date number
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  return null;
}

// Escape a value for SQL insertion
function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return isNaN(value) ? '0' : String(value);
  }
  if (typeof value === 'string') {
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

// Initialize database
function initDatabase() {
  pool = new Pool({ connectionString: config.database.url });
}

// Close database
async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

// Get access token
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
    throw new Error(`Authentication failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Download Excel file
async function downloadFile(accessToken, fileId, fileName) {
  console.log(`   📥 Downloading ${fileName}...`);
  
  const url = `https://graph.microsoft.com/v1.0/drives/${config.sharepoint.driveId}/items/${fileId}/content`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`   ✓ Downloaded ${sizeMB} MB`);
  
  return arrayBuffer;
}

// Parse Excel file
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    cellDates: true,
  });
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

// Build bulk insert query
function buildBulkInsertQuery(tableName, columns, rows, transformFn) {
  const transformedRows = rows.map(transformFn);
  
  const valueRows = transformedRows.map(row => {
    const values = columns.map(col => escapeSqlValue(row[col]));
    return `(${values.join(', ')})`;
  });
  
  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${valueRows.join(', ')}`;
}

// Sync a single file
async function syncFile(accessToken, fileKey) {
  const fileConfig = FILE_CONFIGS[fileKey];
  const fileId = process.env[fileConfig.fileIdEnv];
  
  if (!fileId) {
    console.log(`   ⚠️ Skipping ${fileKey}: ${fileConfig.fileIdEnv} not set`);
    return { file: fileKey, status: 'skipped', reason: 'No file ID' };
  }
  
  console.log(`\n📁 Syncing ${fileConfig.fileName}...`);
  
  const startTime = Date.now();
  
  try {
    // Download file
    const buffer = await downloadFile(accessToken, fileId, fileConfig.fileName);
    
    // Parse Excel
    console.log(`   📊 Parsing Excel...`);
    const rows = parseExcel(buffer);
    console.log(`   ✓ Parsed ${rows.length.toLocaleString()} rows`);
    
    // Log sync start
    await pool.query(
      `INSERT INTO sync_logs (file_name, started_at, status, rows_processed)
       VALUES ($1, NOW(), 'running', 0)`,
      [fileConfig.fileName]
    );
    
    // Truncate and insert
    console.log(`   🗄️ Syncing to database...`);
    await pool.query(`TRUNCATE TABLE ${fileConfig.tableName}`);
    
    // Insert in batches
    const BATCH_SIZE = 1000;
    let processed = 0;
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const query = buildBulkInsertQuery(
        fileConfig.tableName,
        fileConfig.columns,
        batch,
        fileConfig.transform
      );
      await pool.query(query);
      processed += batch.length;
      
      if (processed % 10000 === 0 || i + BATCH_SIZE >= rows.length) {
        const pct = ((processed / rows.length) * 100).toFixed(1);
        console.log(`   Progress: ${processed.toLocaleString()} / ${rows.length.toLocaleString()} (${pct}%)`);
      }
    }
    
    // Log success
    await pool.query(
      `UPDATE sync_logs SET completed_at = NOW(), status = 'success', rows_processed = $1
       WHERE file_name = $2 AND status = 'running'`,
      [processed, fileConfig.fileName]
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ ${fileConfig.fileName}: ${processed.toLocaleString()} rows in ${duration}s`);
    
    return { file: fileKey, status: 'success', rows: processed, duration: parseFloat(duration) };
    
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

// Main function
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 ODOO MULTI-FILE SYNC');
  console.log('═'.repeat(60));
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log(`   Files to sync: ${config.filesToSync.join(', ')}`);
  console.log('');
  
  const startTime = Date.now();
  const results = [];
  
  try {
    validateConfig();
    initDatabase();
    
    console.log('🔑 Authenticating with Microsoft Graph API...');
    const accessToken = await getAccessToken();
    console.log('✅ Authentication successful');
    
    // Sync each file
    for (const fileKey of config.filesToSync) {
      if (FILE_CONFIGS[fileKey]) {
        const result = await syncFile(accessToken, fileKey);
        results.push(result);
      } else {
        console.log(`\n⚠️ Unknown file type: ${fileKey}`);
        results.push({ file: fileKey, status: 'skipped', reason: 'Unknown file type' });
      }
    }
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    const skipped = results.filter(r => r.status === 'skipped');
    const totalRows = successful.reduce((sum, r) => sum + (r.rows || 0), 0);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Total duration: ${duration} seconds`);
    console.log(`   Files processed: ${successful.length}/${results.length}`);
    console.log(`   Total rows synced: ${totalRows.toLocaleString()}`);
    
    if (failed.length > 0) {
      console.log(`   ❌ Failed: ${failed.map(r => r.file).join(', ')}`);
    }
    if (skipped.length > 0) {
      console.log(`   ⚠️ Skipped: ${skipped.map(r => r.file).join(', ')}`);
    }
    
    console.log(`\n   Completed: ${new Date().toISOString()}`);
    
    if (failed.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.log('\n' + '═'.repeat(60));
    console.log('❌ SYNC FAILED');
    console.log('═'.repeat(60));
    console.log(`   Error: ${error.message}`);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();

