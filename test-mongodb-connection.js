// Test MongoDB Connection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');

// Check if MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('   Make sure .env.local file exists and contains MONGODB_URI');
  process.exit(1);
}

console.log('✅ MONGODB_URI found in environment');
console.log('📋 Connection string (masked):');
const uri = process.env.MONGODB_URI;
const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
console.log('   ' + maskedUri);
console.log('');

// Extract username from connection string for verification
const usernameMatch = uri.match(/mongodb\+srv:\/\/([^:]+):/);
const username = usernameMatch ? usernameMatch[1] : 'unknown';
console.log('👤 Username extracted:', username);
console.log('');

// Try to connect
console.log('🔄 Attempting to connect...\n');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log('✅ SUCCESS! MongoDB connected successfully!');
    console.log('   Connection state:', mongoose.connection.readyState);
    console.log('   Database name:', mongoose.connection.name);
    console.log('   Host:', mongoose.connection.host);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed!\n');
    console.error('Error message:', error.message);
    console.error('');
    
    if (error.message.includes('authentication')) {
      console.error('🔍 Authentication Error Details:');
      console.error('   This means your username or password is incorrect.');
      console.error('');
      console.error('💡 Things to check:');
      console.error('   1. Go to MongoDB Atlas → Database Access');
      console.error('   2. Verify the username exists:', username);
      console.error('   3. Click "Edit" on the user to verify/reset password');
      console.error('   4. Make sure the password in .env.local matches exactly');
      console.error('   5. If password has special characters, they need URL encoding');
    } else if (error.message.includes('timeout')) {
      console.error('🔍 Timeout Error Details:');
      console.error('   This means MongoDB cannot be reached.');
      console.error('');
      console.error('💡 Things to check:');
      console.error('   1. Go to MongoDB Atlas → Network Access');
      console.error('   2. Make sure your IP address is whitelisted');
      console.error('   3. Or add 0.0.0.0/0 to allow all IPs (for development)');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('🔍 DNS/Network Error Details:');
      console.error('   This means the cluster URL cannot be resolved.');
      console.error('');
      console.error('💡 Things to check:');
      console.error('   1. Verify the cluster URL is correct');
      console.error('   2. Check your internet connection');
      console.error('   3. Make sure the cluster is not paused');
    }
    
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  });

