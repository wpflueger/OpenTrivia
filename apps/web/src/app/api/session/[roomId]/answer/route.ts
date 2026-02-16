import { NextRequest, NextResponse } from "next/server";
import { getSession, setPlayerAnswer, getPlayer } from "../../store";
import { isRateLimited } from "../../../_lib/rate-limit";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, answer, hostToken } = body;

    if (
      isRateLimited(
        request,
        `session:answer:post:${roomId}:${playerId || "unknown"}`,
        300,
        60_000,
      )
    ) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!roomId || !answer) {
      return NextResponse.json(
        { error: "roomId and answer are required" },
        { status: 400 },
      );
    }

    const session = await getSession(roomId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (hostToken !== session.hostToken) {
      return NextResponse.json(
        { error: "Invalid host token" },
        { status: 403 },
      );
    }

    await setPlayerAnswer(roomId, playerId, answer);

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
  const playerToken = searchParams.get("playerToken");

  if (
    isRateLimited(
      request,
      `session:answer:get:${roomId}:${playerId || "none"}`,
      240,
      60_000,
    )
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const session = await getSession(roomId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (playerId) {
    const player = await getPlayer(roomId, playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (playerToken !== player.playerToken) {
      return NextResponse.json(
        { error: "Invalid player token" },
        { status: 403 },
      );
    }

    return NextResponse.json({ answer: player.answer });
  }

  return NextResponse.json({ error: "playerId is required" }, { status: 400 });
}
