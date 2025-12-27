# Verify MongoDB Connection

## Issue: Still Getting Authentication Error

The error suggests the database user might not exist yet, or the credentials are incorrect.

## Step 1: Create the Database User (If Not Done)

From the image you shared, it looks like you might need to **click "Create Database User"** first:

1. Go to MongoDB Atlas → Database Access
2. If you see the user creation form, **click "Create Database User"**
3. Wait for the user to be created (it takes a few seconds)
4. Make sure the user is listed in your Database Access page

## Step 2: Verify Your Connection String

Your `.env.local` should have:

```env
MONGODB_URI=mongodb+srv://avikmandal901_db_user:aYCcG3GceFYqVK8F@chat.uewmkid.mongodb.net/chat-app?retryWrites=true&w=majority
```

**Check:**
- ✅ No quotes around the connection string
- ✅ No spaces around the `=`
- ✅ Username is exactly: `avikmandal901_db_user`
- ✅ Password is exactly: `aYCcG3GceFYqVK8F`
- ✅ Database name is: `chat-app` (before the `?`)

## Step 3: Verify User Exists

1. Go to MongoDB Atlas → **Database Access**
2. Look for user: `avikmandal901_db_user`
3. If it's NOT there, you need to create it first
4. If it IS there, click "Edit" to verify the password

## Step 4: Check Network Access

1. Go to MongoDB Atlas → **Network Access**
2. Make sure your IP address is whitelisted
3. Or add `0.0.0.0/0` for development (allows all IPs)

## Step 5: Test with Different Connection String Format

Try this alternative format (with appName):

```env
MONGODB_URI=mongodb+srv://avikmandal901_db_user:aYCcG3GceFYqVK8F@chat.uewmkid.mongodb.net/chat-app?retryWrites=true&w=majority&appName=CHAT
```

## Step 6: Reset Password (If Still Not Working)

1. Go to MongoDB Atlas → Database Access
2. Click "Edit" on `avikmandal901_db_user
3. Click "Edit Password"
4. Set a new password (make it simple, like `ChatApp123`)
5. Update `.env.local` with the new password
6. Restart server

## Quick Test

After updating `.env.local`, make sure to:
1. **Save the file**
2. **Stop the server** (Ctrl+C)
3. **Restart**: `npm run dev`

You should see:
```
✅ MongoDB connected successfully
```

If you still see the error, the user might not be created yet - make sure to click "Create Database User" in MongoDB Atlas!

