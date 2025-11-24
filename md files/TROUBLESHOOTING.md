# Troubleshooting Guide

## Server Not Responding on Port 3001

If your Next.js server is listening on port 3001 but not responding, try these steps:

### 1. Check Server Status
Look at the terminal where you ran `npm run dev`. You should see:
- `✓ Ready in X seconds`
- `○ Local: http://localhost:3001`

If you see errors, fix them first.

### 2. Clear Next.js Cache
```bash
# Delete the .next folder
rm -rf .next
# On Windows PowerShell:
Remove-Item -Recurse -Force .next

# Then restart the server
npm run dev:3001
```

### 3. Check for Port Conflicts
```bash
# Windows PowerShell - Check what's using port 3001
netstat -ano | findstr :3001

# If something else is using it, kill that process or use a different port
```

### 4. Verify Dependencies
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### 5. Check Browser Console
Open your browser's developer tools (F12) and check:
- Console tab for JavaScript errors
- Network tab to see if requests are being made

### 6. Try a Different Port
```bash
# Use port 3002 instead
next dev -p 3002
```

### 7. Check Data Files
Make sure all required data files exist:
- `data/branches.json`
- `data/roles.json`
- `data/recipes.json`
- `data/dispatches.json`

### Common Issues

**Issue**: Server shows "Ready" but browser shows "This site can't be reached"
- **Solution**: Make sure you're using `http://localhost:3001` (not `https://`)

**Issue**: Server keeps compiling and never shows "Ready"
- **Solution**: Check for TypeScript errors: `npm run lint`
- Check for missing dependencies or imports

**Issue**: Port 3001 is already in use
- **Solution**: Kill the process using that port or use a different port


