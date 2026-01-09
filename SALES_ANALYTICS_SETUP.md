# Sales Analytics Setup Guide

## Overview

The Sales Snapshot widget on the admin dashboard displays real-time sales data from your Odoo sales system. This guide will help you set up the database connection and sync your sales data.

## Prerequisites

- Vercel account with a Postgres database
- Access to Odoo sales data (Excel/CSV exports)
- Node.js and npm installed

## Step 1: Set Up Database Connection

### 1.1 Create a `.env.local` file in your project root

```bash
# Copy this template and fill in your values
touch .env.local
```

### 1.2 Add Vercel Postgres credentials

Get these from your Vercel project dashboard (Storage > Postgres > Connect):

```env
# Vercel Postgres Database Connection
POSTGRES_URL="postgres://username:password@hostname/database"
POSTGRES_PRISMA_URL="postgres://username:password@hostname/database?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgres://username:password@hostname/database"
POSTGRES_USER="username"
POSTGRES_HOST="hostname"
POSTGRES_PASSWORD="password"
POSTGRES_DATABASE="database"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI API Key (for AI-powered quality analytics)
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

### 1.3 Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET`.

## Step 2: Create Database Tables

Run the table creation script:

```bash
npm run ts-node scripts/create-odoo-tables.ts
```

This creates:
- `odoo_sales` table for sales data
- `sync_logs` table for tracking syncs
- Required indexes for performance

## Step 3: Sync Sales Data

### Option A: Manual Sync from Excel/CSV

1. Export sales data from Odoo to Excel/CSV
2. Upload to SharePoint or place in a sync folder
3. Run the sync script:

```bash
npm run sync-sales
```

### Option B: Automated SharePoint Sync

Configure SharePoint sync in your environment:

```bash
node scripts/sync-sharepoint-sales.js
```

## Step 4: Verify Setup

1. Start the development server:

```bash
npm run dev
```

2. Navigate to `/admin` (admin dashboard)
3. Check the "Sales Snapshot" widget
4. You should see:
   - Today's Revenue
   - This Month's Revenue  
   - Units Sold Today
   - Orders Today

## Troubleshooting

### Issue: "Sales Snapshot widget not showing"

**Cause**: Database not configured or no data available

**Solution**:
1. Check `.env.local` file exists with correct credentials
2. Verify database connection:
   ```bash
   npm run ts-node scripts/test-db-connection.ts
   ```
3. Check if tables exist:
   ```bash
   npm run ts-node scripts/create-odoo-tables.ts
   ```
4. Verify data exists in `odoo_sales` table

### Issue: "Connection failed: ENOTFOUND"

**Cause**: Database host cannot be resolved

**Solution**:
1. Check your internet connection
2. Verify `POSTGRES_HOST` in `.env.local` is correct
3. Ensure Vercel Postgres database is active
4. Check if your IP is whitelisted (if applicable)

### Issue: "Numbers show as 0"

**Cause**: No sales data for today/this month

**Solution**:
1. Check if data exists in database:
   ```sql
   SELECT COUNT(*) FROM odoo_sales WHERE date = CURRENT_DATE;
   ```
2. Sync recent sales data using the sync script
3. Verify data import was successful in `sync_logs` table

### Issue: "API returns 500 error"

**Cause**: Database query error or missing table

**Solution**:
1. Check server logs in terminal
2. Verify `odoo_sales` table exists
3. Run table creation script again
4. Check database user has read permissions

## Data Structure

The `odoo_sales` table contains:

```sql
- order_number: VARCHAR(100) - Unique order identifier
- order_type: VARCHAR(50) - Type of order
- branch: VARCHAR(100) - Branch name
- date: DATE - Order date
- client: VARCHAR(255) - Customer name
- items: TEXT - Product description
- category: VARCHAR(100) - Product category
- qty: DECIMAL - Quantity sold
- price_subtotal_with_tax: DECIMAL - Total price including tax
```

## API Endpoints

### GET `/api/analytics/summary`

Returns sales summary data:

```json
{
  "today": {
    "revenue": 15420.50,
    "units": 245,
    "orders": 89,
    "changes": {
      "revenue": 12.5,
      "units": 8.3,
      "orders": -5.2
    }
  },
  "thisMonth": {
    "revenue": 255000,
    "units": 4890,
    "orders": 1250,
    "changes": {
      "revenue": 172.3
    }
  }
}
```

### GET `/api/analytics/trends?days=30`

Returns daily sales trends for charts.

### GET `/api/analytics/branches?period=month`

Returns branch-level sales breakdown.

## Performance Optimization

The system uses indexes on:
- `date` - Fast date-range queries
- `branch` - Branch filtering
- `(branch, date)` - Combined queries
- `order_number` - Order lookups
- `category` - Product category analysis

Queries are optimized to run in < 2 seconds even with millions of records.

## Support

For additional help:
1. Check server terminal logs for detailed errors
2. Review Vercel Postgres dashboard for connection issues
3. Verify data format matches expected schema
4. Check browser console for frontend errors

