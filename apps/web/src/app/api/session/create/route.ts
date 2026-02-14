import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession, getPlayerList } from "../store";

export async function POST(request: NextRequest) {
  try {
    const { roomId, hostToken } = createSession();

    return NextResponse.json({ roomId, hostToken });
  } catch (error) {
    console.error("Session create error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const session = getSession(roomId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const playerList = getPlayerList(roomId);

  return NextResponse.json({
    roomId: session.roomId,
    hostToken: session.hostToken,
    players: playerList,
  });
}
