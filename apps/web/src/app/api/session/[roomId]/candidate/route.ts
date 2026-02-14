import { NextRequest, NextResponse } from "next/server";
import { getSession, addCandidate, getPlayer } from "../../store";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, candidate, hostToken } = body;

    if (!roomId || !candidate) {
      return NextResponse.json(
        { error: "roomId and candidate are required" },
        { status: 400 },
      );
    }

    const session = getSession(roomId);

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
    }

    addCandidate(roomId, playerId, candidate);

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
  const hostToken = searchParams.get("hostToken");
  const afterIndex = searchParams.get("afterIndex");

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
