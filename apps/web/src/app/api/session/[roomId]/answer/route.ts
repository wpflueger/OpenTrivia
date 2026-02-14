import { NextRequest, NextResponse } from "next/server";
import { getSession, setPlayerAnswer, getPlayer } from "../../store";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, answer, hostToken } = body;

    if (!roomId || !answer) {
      return NextResponse.json(
        { error: "roomId and answer are required" },
        { status: 400 },
      );
    }

    const session = getSession(roomId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (hostToken !== session.hostToken) {
      return NextResponse.json(
        { error: "Invalid host token" },
        { status: 403 },
      );
    }

    setPlayerAnswer(roomId, playerId, answer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Answer error:", error);
    return NextResponse.json(
      { error: "Failed to set answer" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const session = getSession(roomId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (playerId) {
    const player = getPlayer(roomId, playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    return NextResponse.json({ answer: player.answer });
  }

  return NextResponse.json({ error: "playerId is required" }, { status: 400 });
}
