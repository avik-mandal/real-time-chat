import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check against User A credentials
    const userAUsername = process.env.USER_A_USERNAME;
    const userAPassword = process.env.USER_A_PASSWORD;

    if (username === userAUsername && password === userAPassword) {
      return NextResponse.json({
        success: true,
        message: "Login successful",
        username: username,
      });
    }

    // Check against User B credentials
    const userBUsername = process.env.USER_B_USERNAME;
    const userBPassword = process.env.USER_B_PASSWORD;

    if (username === userBUsername && password === userBPassword) {
      return NextResponse.json({
        success: true,
        message: "Login successful",
        username: username,
      });
    }

    // No match found
    return NextResponse.json(
      { success: false, error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}

