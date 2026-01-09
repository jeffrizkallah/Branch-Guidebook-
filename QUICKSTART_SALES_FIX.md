# Quick Start: Fix Sales Snapshot Widget

## 🚨 The Problem

Your Sales Snapshot widget shows no data because the database is not configured.

## ✅ Quick Fix (5 minutes)

### Step 1: Create `.env.local` file

In your project root, create a file named `.env.local`:

```bash
# Windows PowerShell
New-Item .env.local -ItemType File

# macOS/Linux
touch .env.local
```

### Step 2: Add Database Credentials

Open `.env.local` and add your Vercel Postgres credentials.

**Get credentials from:** https://vercel.com/dashboard → Your Project → Storage → Postgres → .env.local tab

Copy and paste the entire content that looks like:

```env
POSTGRES_URL="postgres://default:xxxx@xx-xx-xx.aws.neon.tech:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:xxxx@xx-xx-xx.aws.neon.tech:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:xxxx@xx-xx-xx.aws.neon.tech:5432/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="xx-xx-xx.aws.neon.tech"
POSTGRES_PASSWORD="xxxx"
POSTGRES_DATABASE="verceldb"
```

Also add:
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-this-with-command-below"
```

Generate NextAuth secret:
```bash
openssl rand -base64 32
```

### Step 3: Create Database Tables

```bash
npx ts-node scripts/create-odoo-tables.ts
```

You should see:
```
✅ All Odoo tables and indexes created successfully!
```

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 5: Check the Admin Dashboard

Navigate to: http://localhost:3000/admin

**You should now see:**
- The Sales Snapshot widget displaying
- If no data synced yet: Shows `AED 0` with 0% changes (this is normal!)
- If database works: Widget shows actual data

## 🎯 Expected Results

### Without Data (But Working Database):
```
Today's Revenue: AED 0
Units Sold Today: 0
Orders Today: 0
This Month: AED 0
```

This is **CORRECT** - it means the database connection works, you just need to sync data.

### With Data:
```
Today's Revenue: AED 15,420
Units Sold Today: 245
Orders Today: 89
This Month: AED 255K
```

## 📊 Next Step: Sync Sales Data

To get actual numbers:

1. Export sales data from Odoo to Excel/CSV
2. Run sync script:
   ```bash
   node scripts/sync-sharepoint-sales.js
   ```
3. Refresh admin dashboard
4. See real numbers!

## ❌ Still Not Working?

### Error: "Database Connection Error"

**Check:**
1. Is `.env.local` in project root?
2. Are credentials correct? (copy entire block from Vercel)
3. Is database active? (check Vercel dashboard)

**Fix:**
```bash
# Verify file exists
ls -la .env.local  # macOS/Linux
dir .env.local     # Windows

# Check content (don't share this publicly!)
cat .env.local     # macOS/Linux
type .env.local    # Windows
```

### Error: "Table does not exist"

**Fix:**
```bash
npx ts-node scripts/create-odoo-tables.ts
```

### Error: "Cannot find module"

**Fix:**
```bash
npm install
```

## 📚 Full Documentation

For complete setup including data sync:
- See `SALES_ANALYTICS_SETUP.md`
- See `SALES_SNAPSHOT_FIX.md` (technical details)

## 🆘 Emergency Contact

If you're completely stuck:

1. **Check terminal logs** - Look for red error messages
2. **Check browser console** - Press F12, look for errors
3. **Verify environment**:
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 9+
   ```

## ✨ Success Checklist

- [ ] Created `.env.local` file
- [ ] Added all Vercel Postgres variables
- [ ] Added NEXTAUTH_URL and NEXTAUTH_SECRET
- [ ] Ran table creation script successfully
- [ ] Restarted dev server
- [ ] Admin dashboard shows Sales Snapshot widget
- [ ] No red error messages in terminal
- [ ] No errors in browser console

If all checked, you're done! The widget is working (even if showing zeros).

To get real data, proceed with syncing sales from Odoo.

