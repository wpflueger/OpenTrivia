import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  setPlayerOffer,
  getPlayerList,
  getPlayer,
} from "../../store";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, offer, hostToken } = body;

    if (!roomId || !offer) {
      return NextResponse.json(
        { error: "roomId and offer are required" },
        { status: 400 },
      );
    }

    const session = getSession(roomId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (hostToken && hostToken !== session.hostToken) {
      return NextResponse.json(
        { error: "Invalid host token" },
        { status: 403 },
      );
    }

    const actualPlayerId = playerId || crypto.randomUUID();
    setPlayerOffer(roomId, actualPlayerId, offer);

    return NextResponse.json({ success: true, playerId: actualPlayerId });
  } catch (error) {
    console.error("Offer error:", error);
    return NextResponse.json({ error: "Failed to set offer" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  const hostToken = searchParams.get("hostToken");

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const session = getSession(roomId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (hostToken && hostToken !== session.hostToken) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 403 });
  }

  if (playerId) {
    const player = getPlayer(roomId, playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    return NextResponse.json({ offer: player.offer });
  }

  const playerList = getPlayerList(roomId);

  return NextResponse.json({ players: playerList });
}
