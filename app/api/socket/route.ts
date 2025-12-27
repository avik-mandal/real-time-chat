import { NextRequest } from "next/server";

// Note: Socket.IO server is now handled by the custom server.js file
// This route is kept for compatibility but the actual Socket.IO server
// is initialized in server.js for proper WebSocket upgrade handling
export async function GET(req: NextRequest) {
  return new Response("Socket server is running via custom server", {
    status: 200,
  });
}
