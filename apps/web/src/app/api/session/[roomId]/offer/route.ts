import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  setPlayerOffer,
  getPlayerList,
  getPlayer,
} from "../../store";
import { isRateLimited } from "../../../_lib/rate-limit";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, playerToken, nickname, offer, hostToken } = body;

    if (
      isRateLimited(
        request,
        `session:offer:post:${roomId}:${playerId || "new"}`,
        300,
        60_000,
      )
    ) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!roomId || !offer) {
      return NextResponse.json(
        { error: "roomId and offer are required" },
        { status: 400 },
      );
    }

    const session = await getSession(roomId);

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
    const existingPlayer = await getPlayer(roomId, actualPlayerId);
    if (
      existingPlayer &&
      !hostToken &&
      playerToken !== existingPlayer.playerToken
    ) {
      return NextResponse.json(
        { error: "Invalid player token" },
        { status: 403 },
      );
    }

    const newPlayerToken = await setPlayerOffer(
      roomId,
      actualPlayerId,
      nickname,
      offer,
    );

    return NextResponse.json({
      success: true,
      playerId: actualPlayerId,
      playerToken: newPlayerToken,
    });
  } catch (error) {
    console.error("Offer error:", error);
    return NextResponse.json({ error: "Failed to set offer" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  const playerToken = searchParams.get("playerToken");
  const hostToken = searchParams.get("hostToken");

  const scopeSuffix = playerId || hostToken || "list";
  if (
    isRateLimited(
      request,
      `session:offer:get:${roomId}:${scopeSuffix}`,
      600,
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

  if (hostToken && hostToken !== session.hostToken) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 403 });
  }

  if (playerId) {
    const player = await getPlayer(roomId, playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (hostToken !== session.hostToken && playerToken !== player.playerToken) {
      return NextResponse.json(
        { error: "Invalid player token" },
        { status: 403 },
      );
    }

    return NextResponse.json({ offer: player.offer });
  }

  const playerList = await getPlayerList(roomId);

  return NextResponse.json({ players: playerList });
}
