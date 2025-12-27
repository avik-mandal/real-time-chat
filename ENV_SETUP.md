# Environment Variables Setup

## Required: Create `.env.local` file

Create a file named `.env.local` in the root directory of your project with the following content:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
```

## How to Get Your MongoDB Connection String

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (if you don't have one)
3. Create a new cluster (free tier M0 works fine)
4. Click "Connect" on your cluster
5. Choose "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your database user password
8. Replace `<dbname>` with `chat-app` (or your preferred database name)

Example:
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority
```

**Important**: 
- Create a database user in "Database Access" section
- Whitelist your IP address in "Network Access" (use `0.0.0.0/0` for development)

### Option 2: Local MongoDB

If you have MongoDB installed locally:

```env
MONGODB_URI=mongodb://localhost:27017/chat-app
```

## File Structure

Your `.env.local` file should look like this:

```env
# MongoDB Connection String (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority

# Login Credentials (REQUIRED)
LOGIN_USERNAME=admin
LOGIN_PASSWORD=admin123

# Optional - Server hostname
# HOSTNAME=localhost

# Optional - Server port
# PORT=3000
```

## Login Credentials

The app uses static credentials stored in `.env.local`:

- **LOGIN_USERNAME**: The username for login (default: `admin`)
- **LOGIN_PASSWORD**: The password for login (default: `admin123`)

You can change these to any username and password you prefer. These credentials are used to authenticate users before they can access the chat.

## Security Notes

- ⚠️ **Never commit `.env.local` to git** (it's already in `.gitignore`)
- ✅ Keep your MongoDB password secure
- ✅ Use different connection strings for development and production

## Verification

After creating `.env.local`, restart your server:

```bash
npm run dev
```

You should see in the console:
```
✅ MongoDB connected successfully
```

If you see an error, check:
1. The connection string is correct
2. Your MongoDB Atlas IP whitelist includes your IP
3. Your database user password is correct

