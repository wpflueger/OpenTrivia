import { NextRequest, NextResponse } from "next/server";
import { getSession, addCandidate, getPlayer } from "../../store";
import { isRateLimited } from "../../../_lib/rate-limit";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, playerToken, candidate, hostToken } = body;

    if (
      isRateLimited(
        request,
        `session:candidate:post:${roomId}:${playerId || "unknown"}`,
        600,
        60_000,
      )
    ) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!roomId || !candidate) {
      return NextResponse.json(
        { error: "roomId and candidate are required" },
        { status: 400 },
      );
    }

    const session = await getSession(roomId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (hostToken) {
      if (hostToken !== session.hostToken) {
        return NextResponse.json(
          { error: "Invalid host token" },
          { status: 403 },
        );
      }
    } else {
      const player = await getPlayer(roomId, playerId);
      if (!player || player.playerToken !== playerToken) {
        return NextResponse.json(
          { error: "Invalid player token" },
          { status: 403 },
        );
      }
    }

    await addCandidate(roomId, playerId, candidate);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Candidate error:", error);
    return NextResponse.json(
      { error: "Failed to add candidate" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  const playerToken = searchParams.get("playerToken");
  const hostToken = searchParams.get("hostToken");
  const afterIndex = searchParams.get("afterIndex");

  if (
    isRateLimited(
      request,
      `session:candidate:get:${roomId}:${playerId || hostToken || "none"}`,
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

    let candidates = player.candidates;
    if (afterIndex !== null) {
      const idx = parseInt(afterIndex, 10);
      if (!isNaN(idx)) {
        candidates = candidates.slice(idx);
      }
    }

    return NextResponse.json({ candidates });
  }

  if (hostToken === session.hostToken) {
    const allCandidates: Record<string, RTCIceCandidateInit[]> = {};
    session.players.forEach((player, pid) => {
      allCandidates[pid] = player.candidates;
    });
    return NextResponse.json({ candidatesByPlayer: allCandidates });
  }

  return NextResponse.json(
    { error: "playerId or hostToken required" },
    { status: 400 },
  );
}
