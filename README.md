# 2-User Chat App – FINAL

A real-time chat application built with Next.js, Socket.IO, and MongoDB.

## Features

- ✅ Mobile-first Tailwind UI
- ✅ WhatsApp-style chat bubbles
- ✅ Dark mode toggle
- ✅ Socket.IO real-time messaging
- ✅ MongoDB database integration
- ✅ Message history persistence
- ✅ Auto-load previous messages
- ✅ Connection status indicator
- ✅ Responsive design

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works) or local MongoDB instance

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MongoDB

#### Option A: MongoDB Atlas (Recommended for production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority`)

#### Option B: Local MongoDB

1. Install MongoDB locally
2. Use connection string: `mongodb://localhost:27017/chat-app`

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string_here
```

Example:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
```

### 4. Run the Application

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 5. Test the Chat

1. Open two browser windows/tabs:
   - Window 1: `http://localhost:3000/chat?user=Alice`
   - Window 2: `http://localhost:3000/chat?user=Bob`

2. Start chatting! Messages will be:
   - Sent in real-time via Socket.IO
   - Saved to MongoDB database
   - Loaded when you refresh or reconnect

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── messages/      # API route to fetch messages
│   │   └── socket/        # Socket.IO route
│   ├── chat/
│   │   └── page.tsx       # Main chat page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── lib/
│   ├── mongodb.ts          # MongoDB connection utility
│   └── socket.ts           # Socket.IO client
├── models/
│   └── Message.ts          # Message schema/model
├── server.js               # Custom Next.js server with Socket.IO
└── package.json
```

## How It Works

1. **Real-time Messaging**: Uses Socket.IO for instant message delivery
2. **Database Storage**: All messages are saved to MongoDB
3. **Message History**: Previous messages are loaded when users join
4. **Auto-reconnection**: Socket.IO automatically reconnects if connection is lost

## Troubleshooting

### Messages not saving to database?

- Check that `MONGODB_URI` is set in `.env.local`
- Verify MongoDB connection in server console logs
- Check MongoDB Atlas IP whitelist settings

### Real-time not working?

- Make sure server is running with `npm run dev`
- Check browser console for connection errors
- Verify Socket.IO server is initialized (check server logs)

### Can't see previous messages?

- Verify MongoDB connection is successful
- Check that messages exist in your database
- Check browser console for API errors

## License

MIT
