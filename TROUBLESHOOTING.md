# Troubleshooting Guide

## Issue: Database Not Connecting / Messages Not Saving

### Step 1: Verify .env.local File Exists

1. Make sure you have a `.env.local` file in the **root directory** (same folder as `package.json`)
2. The file should contain:
   ```env
   MONGODB_URI=your_connection_string_here
   ```

### Step 2: Check Your Connection String Format

✅ **Correct format:**
```
mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
```

❌ **Common mistakes:**
- Missing `mongodb+srv://` prefix
- Not replacing `<password>` with actual password
- Using `localhost` instead of Atlas cluster URL
- Missing database name in the connection string

### Step 3: Verify MongoDB Atlas Settings

1. **Database User:**
   - Go to MongoDB Atlas → Database Access
   - Make sure you have a user created
   - Username and password must match your connection string

2. **Network Access:**
   - Go to MongoDB Atlas → Network Access
   - Add your IP address (or `0.0.0.0/0` for development)
   - Wait a few minutes for changes to take effect

3. **Cluster Status:**
   - Make sure your cluster is running (not paused)
   - Free tier clusters pause after inactivity

### Step 4: Check Server Console Logs

When you run `npm run dev`, you should see:

✅ **Success:**
```
🔄 Connecting to MongoDB...
✅ MongoDB connected successfully
✅ Message model loaded
🚀 Socket.IO server initialized on path: /api/socket
> Ready on http://localhost:3000
```

❌ **If you see errors:**

**Error: "MONGODB_URI not set"**
- Solution: Create `.env.local` file with your connection string

**Error: "authentication failed"**
- Solution: Check username/password in connection string

**Error: "timeout" or "connection refused"**
- Solution: Check IP whitelist in MongoDB Atlas

**Error: "Message model loaded" not appearing**
- Solution: This is okay, the model will be created automatically

### Step 5: Test the Connection

1. Restart your server: `npm run dev`
2. Send a test message in the chat
3. Check server console for: `💾 Message saved to database`
4. Check MongoDB Atlas → Browse Collections to see if messages appear

### Step 6: Verify Messages Are Being Saved

1. Send a message in the chat
2. Check server console - you should see:
   ```
   📩 Message received from Alice : Hello
   💾 Message saved to database
   ```
3. Refresh the page - previous messages should load
4. Check MongoDB Atlas Collections to see stored messages

## Issue: Real-time Not Working

### Check Socket Connection

1. Open browser console (F12)
2. Look for: `✅ Socket connected: [socket-id]`
3. Check connection status indicator in chat UI (green = connected)

### Common Issues

- **"Disconnected" status**: Click "Retry" button or refresh page
- **Messages not appearing**: Check server console for errors
- **Connection errors**: Make sure server is running with `npm run dev`

## Issue: Previous Messages Not Loading

1. Check if database is connected (see Step 4)
2. Verify messages exist in MongoDB
3. Check browser console for API errors
4. Try refreshing the page

## Quick Fix Checklist

- [ ] `.env.local` file exists in root directory
- [ ] `MONGODB_URI` is set correctly (no quotes, no spaces)
- [ ] MongoDB Atlas IP whitelist includes your IP
- [ ] Database user credentials are correct
- [ ] Server restarted after creating `.env.local`
- [ ] `dotenv` package is installed (`npm install dotenv`)
- [ ] MongoDB cluster is running (not paused)

## Still Not Working?

1. **Check the exact error message** in server console
2. **Verify connection string** by testing it in MongoDB Compass
3. **Check MongoDB Atlas logs** for connection attempts
4. **Try a simple connection test** - create a test file to verify connection

## Test Connection Script

Create `test-connection.js`:

```javascript
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connection successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  });
```

Run: `node test-connection.js`

