/**
 * Extract All Products Sold from Odoo Sales Data
 * 
 * This script queries the odoo_sales table and extracts all unique products
 * sold within a specified date range.
 * 
 * Usage: node scripts/extract-products.js
 * 
 * Optional environment variables:
 * - START_DATE: Start date (default: 2025-09-01)
 * - END_DATE: End date (default: today)
 */

require('dotenv').config({ path: '.env.local' });

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

neonConfig.webSocketConstructor = ws;

async function extractProducts() {
  const startDate = process.env.START_DATE || '2025-09-01';
  const endDate = process.env.END_DATE || new Date().toISOString().split('T')[0];
  
  console.log('═'.repeat(70));
  console.log('🔍 EXTRACTING ALL PRODUCTS SOLD FROM ODOO SALES DATA');
  console.log('═'.repeat(70));
  console.log(`   Date Range: ${startDate} to ${endDate}`);
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Query all unique products with aggregated stats
    console.log('📊 Querying database...');
    const result = await pool.query(`
      SELECT DISTINCT 
        items as product_name,
        category,
        product_group,
        barcode,
        unit_of_measure,
        COUNT(*) as times_sold,
        SUM(qty) as total_quantity,
        SUM(price_subtotal_with_tax) as total_revenue,
        AVG(unit_price) as avg_unit_price,
        MIN(date) as first_sale_date,
        MAX(date) as last_sale_date
      FROM odoo_sales
      WHERE date >= $1 
        AND date <= $2
        AND items IS NOT NULL 
        AND items != ''
      GROUP BY items, category, product_group, barcode, unit_of_measure
      ORDER BY total_revenue DESC
    `, [startDate, endDate]);
    
    console.log(`✅ Found ${result.rows.length} unique products\n`);
    
    // Display summary by category
    const categoryStats = {};
    result.rows.forEach(row => {
      const cat = row.category || 'Uncategorized';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, revenue: 0 };
      }
      categoryStats[cat].count++;
      categoryStats[cat].revenue += Number(row.total_revenue);
    });
    
    console.log('📁 Products by Category:');
    console.log('-'.repeat(50));
    Object.entries(categoryStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .forEach(([cat, stats]) => {
        console.log(`   ${cat}: ${stats.count} products (AED ${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      });
    console.log('');
    
    // Display top 20 products
    console.log('🏆 Top 20 Products by Revenue:');
    console.log('-'.repeat(70));
    result.rows.slice(0, 20).forEach((row, index) => {
      const revenue = Number(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = Number(row.total_quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      console.log(`${String(index + 1).padStart(2)}. ${row.product_name}`);
      console.log(`    Category: ${row.category || 'Uncategorized'} | Qty: ${qty} | Revenue: AED ${revenue}`);
    });
    console.log('');
    
    // Prepare output data
    const output = {
      extractedAt: new Date().toISOString(),
      dateRange: { 
        from: startDate, 
        to: endDate 
      },
      summary: {
        totalProducts: result.rows.length,
        totalRevenue: result.rows.reduce((sum, row) => sum + Number(row.total_revenue), 0),
        totalQuantitySold: result.rows.reduce((sum, row) => sum + Number(row.total_quantity), 0),
        categoriesCount: Object.keys(categoryStats).length,
        categoryBreakdown: Object.entries(categoryStats)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .map(([category, stats]) => ({
            category,
            productCount: stats.count,
            totalRevenue: stats.revenue
          }))
      },
      products: result.rows.map(row => ({
        name: row.product_name,
        category: row.category || 'Uncategorized',
        productGroup: row.product_group || null,
        barcode: row.barcode || null,
        unitOfMeasure: row.unit_of_measure || null,
        timesSold: Number(row.times_sold),
        totalQuantity: Number(row.total_quantity),
        totalRevenue: Number(row.total_revenue),
        avgUnitPrice: Number(row.avg_unit_price),
        firstSaleDate: row.first_sale_date,
        lastSaleDate: row.last_sale_date
      }))
    };
    
    // Save to JSON file
    const outputPath = path.join(__dirname, '..', 'data', 'products-sold.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`📁 Full results saved to: data/products-sold.json`);
    
    // Also create a simple list of product names
    const productListPath = path.join(__dirname, '..', 'data', 'products-list.txt');
    const productList = result.rows.map(row => row.product_name).join('\n');
    fs.writeFileSync(productListPath, productList);
    console.log(`📁 Product names list saved to: data/products-list.txt`);
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('✨ EXTRACTION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`   Total Products: ${result.rows.length}`);
    console.log(`   Total Revenue: AED ${output.summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Categories: ${output.summary.categoriesCount}`);
    console.log('');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

extractProducts();
