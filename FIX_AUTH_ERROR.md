# Fix MongoDB Authentication Error

## Error: "bad auth : authentication failed"

This means your username or password in the `MONGODB_URI` is incorrect.

## Common Causes & Solutions

### 1. Password Contains Special Characters

If your MongoDB password contains special characters like `@`, `#`, `%`, `&`, etc., you need to **URL-encode** them.

**Special characters that need encoding:**
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `?` → `%3F`
- `=` → `%3D`

**Example:**
If your password is `MyP@ss#123`, it should be:
```
mongodb+srv://username:MyP%40ss%23123@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
```

### 2. Wrong Username or Password

**Steps to verify:**
1. Go to MongoDB Atlas → Database Access
2. Check your database user's username
3. Click "Edit" on the user
4. If you forgot the password, click "Edit Password" to reset it
5. Make sure the username and password in your `.env.local` match exactly

### 3. Using Wrong Connection String

Make sure you're using the connection string from:
- MongoDB Atlas → Clusters → Connect → Connect your application
- NOT from "Connect with MongoDB Compass" or "Connect with VS Code"

### 4. Quick Fix: Reset Database User Password

1. Go to MongoDB Atlas → Database Access
2. Click "Edit" on your database user
3. Click "Edit Password"
4. Set a new simple password (no special characters recommended)
5. Update your `.env.local` with the new password

## Step-by-Step Fix

### Option 1: Use Simple Password (Easiest)

1. Go to MongoDB Atlas → Database Access
2. Edit your database user
3. Set a new password with only letters and numbers (e.g., `MyPassword123`)
4. Update `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://yourusername:MyPassword123@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
   ```
5. Restart server: `npm run dev`

### Option 2: URL-Encode Your Password

If you want to keep your current password:

1. Use an online URL encoder: https://www.urlencoder.org/
2. Paste your password
3. Copy the encoded version
4. Use it in your connection string

**Example:**
- Original password: `P@ssw0rd#123`
- Encoded: `P%40ssw0rd%23123`
- Connection string: `mongodb+srv://username:P%40ssw0rd%23123@cluster.mongodb.net/chat-app?retryWrites=true&w=majority`

### Option 3: Create New Database User

1. Go to MongoDB Atlas → Database Access
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `chatapp` (or any name)
5. Password: Choose a simple password
6. Database User Privileges: "Atlas admin" or "Read and write to any database"
7. Click "Add User"
8. Use the new credentials in your `.env.local`

## Verify Your Connection String Format

Your `.env.local` should look like this:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority
```

**Important:**
- No spaces around the `=`
- No quotes around the connection string
- Replace `USERNAME` with your actual username
- Replace `PASSWORD` with your actual password (URL-encoded if needed)
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
- Keep `/chat-app` as the database name (or change it if you prefer)

## Test Your Connection

After updating `.env.local`, restart your server:

```bash
npm run dev
```

You should see:
```
🔄 Connecting to MongoDB...
✅ MongoDB connected successfully
✅ Message model loaded
```

If you still see the error, double-check:
1. Username is correct (case-sensitive)
2. Password is correct (case-sensitive)
3. Password is URL-encoded if it has special characters
4. No extra spaces or quotes in the connection string

