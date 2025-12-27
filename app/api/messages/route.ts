export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select("sender text timestamp fileUrl fileType fileName readBy createdAt")
      .lean();

    // Reverse to get chronological order (oldest first)
    const reversedMessages = messages.reverse();

    return NextResponse.json(
      {
        success: true,
        messages: reversedMessages,
        count: reversedMessages.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}

