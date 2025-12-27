// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Import Message model
let Message;
try {
  // Since Message.ts is TypeScript, we need to compile it first or use a different approach
  // For now, we'll define the schema directly in server.js
  const MessageSchema = new mongoose.Schema({
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileType: {
      type: String,
      enum: ['image', 'video'],
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    readBy: {
      type: [String],
      default: [],
    },
  }, {
    timestamps: true,
  });

  MessageSchema.index({ timestamp: -1 });

  Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
  console.log('✅ Message model loaded');
} catch (error) {
  console.error('❌ Error loading Message model:', error);
  Message = null;
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Connect to MongoDB
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set. Messages will not be saved to database.');
    console.warn('   Please create a .env.local file with: MONGODB_URI=your_connection_string');
    return false;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return true;
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('   💡 Check your username and password in MONGODB_URI');
    } else if (error.message.includes('timeout')) {
      console.error('   💡 Check your network connection and IP whitelist in MongoDB Atlas');
    }
    return false;
  }
};

app.prepare().then(async () => {
  // Connect to database
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.log('⚠️  Running without database. Messages will not be persisted.');
  }
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Set production mode if not in dev
  if (!dev) {
    process.env.NODE_ENV = 'production';
  }

  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: '*',
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('🔵 User connected:', socket.id);
    console.log('   Total connections:', io.engine.clientsCount);

    socket.on('join', async (user) => {
      socket.join('chat-room');
      console.log(`🟢 ${user} (${socket.id}) joined chat-room`);
      console.log('   Users in chat-room:', io.sockets.adapter.rooms.get('chat-room')?.size || 0);

      // Load previous messages from database
      try {
        if (mongoose.connection.readyState === 1 && Message) {
          const previousMessages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();
          
          // Send previous messages to the newly joined user
          socket.emit('previous-messages', previousMessages.reverse());
          console.log(`   📜 Sent ${previousMessages.length} previous messages to ${user}`);
        }
      } catch (error) {
        console.error('   ❌ Error loading previous messages:', error);
      }
    });

    socket.on('send-message', async (msg) => {
      console.log('📩 Message received from', msg.sender, ':', msg.text || msg.fileType);
      
      // Save message to database
      let savedMessage = null;
      try {
        if (mongoose.connection.readyState === 1 && Message) {
          const messageData = {
            sender: msg.sender,
            text: msg.text || '',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          };
          
          if (msg.fileUrl) {
            messageData.fileUrl = msg.fileUrl;
            messageData.fileType = msg.fileType;
            messageData.fileName = msg.fileName;
          }
          
          const message = new Message(messageData);
          savedMessage = await message.save();
          console.log('   💾 Message saved to database');
        } else {
          console.log('   ⚠️  Database not connected, message not saved');
        }
      } catch (error) {
        console.error('   ❌ Error saving message to database:', error);
      }
      
      // Add message ID and readBy array to the message
      const messageToSend = {
        ...msg,
        _id: savedMessage?._id?.toString(),
        readBy: [],
      };
      
      console.log('   Broadcasting to chat-room...');
      
      // Broadcast to all users in chat-room except the sender
      const roomSize = io.sockets.adapter.rooms.get('chat-room')?.size || 0;
      console.log('   Room size:', roomSize);
      
      socket.to('chat-room').emit('receive-message', messageToSend);
      console.log('   ✅ Message broadcasted');
    });

    socket.on('mark-as-read', async (data) => {
      const { messageId, user } = data;
      
      try {
        if (mongoose.connection.readyState === 1 && Message && messageId) {
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: user }
          });
          
          // Notify all users that message was read
          io.to('chat-room').emit('message-read', { messageId, readBy: user });
          console.log(`   ✅ Message ${messageId} marked as read by ${user}`);
        }
      } catch (error) {
        console.error('   ❌ Error marking message as read:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 User disconnected:', socket.id, 'Reason:', reason);
      console.log('   Remaining connections:', io.engine.clientsCount);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  console.log('🚀 Socket.IO server initialized on path: /api/socket');

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

