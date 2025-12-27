# MongoDB Connection String Format

## Your Password
Your password is: `aYCcG3GceFYqVK8F` (no special characters, so no encoding needed)

## Connection String Format

Your `.env.local` file should have this format:

```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:aYCcG3GceFYqVK8F@YOUR_CLUSTER_URL/chat-app?retryWrites=true&w=majority
```

## Steps to Get Your Connection String

1. **Go to MongoDB Atlas** → Your Cluster
2. **Click "Connect"** button
3. **Choose "Connect your application"**
4. **Copy the connection string** - it will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Replace the placeholders:**
   - Replace `<username>` with your actual MongoDB username
   - Replace `<password>` with: `aYCcG3GceFYqVK8F`
   - Replace `?retryWrites=true&w=majority` with `/chat-app?retryWrites=true&w=majority`

## Example

If your username is `myuser` and cluster is `cluster0.abc123.mongodb.net`:

```env
MONGODB_URI=mongodb+srv://myuser:aYCcG3GceFYqVK8F@cluster0.abc123.mongodb.net/chat-app?retryWrites=true&w=majority
```

## Common Mistakes to Avoid

❌ **Wrong:**
```env
MONGODB_URI="mongodb+srv://username:password@cluster..."  # Quotes around it
MONGODB_URI = mongodb+srv://...  # Spaces around =
MONGODB_URI=mongodb+srv://username:password@cluster...  # Missing database name
```

✅ **Correct:**
```env
MONGODB_URI=mongodb+srv://username:aYCcG3GceFYqVK8F@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority
```

## Verify Your Username

1. Go to MongoDB Atlas → **Database Access**
2. Check the **username** listed there (it's case-sensitive!)
3. Make sure it matches exactly in your connection string

## After Updating

1. Save `.env.local`
2. Restart server: `npm run dev`
3. You should see: `✅ MongoDB connected successfully`

