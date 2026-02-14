import { NextRequest, NextResponse } from 'next/server';

interface PlayerConnection {
  playerId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidates: RTCIceCandidateInit[];
  createdAt: number;
}

const sessions = new Map<
  string,
  {
    roomId: string;
    hostToken: string;
    createdAt: number;
    players: Map<string, PlayerConnection>;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, playerId, candidate, hostToken } = body;

    if (!roomId || !candidate) {
      return NextResponse.json({ error: 'roomId and candidate are required' }, { status: 400 });
    }

    const session = sessions.get(roomId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (hostToken) {
      if (hostToken !== session.hostToken) {
        return NextResponse.json({ error: 'Invalid host token' }, { status: 403 });
      }
      const player = session.players.get(playerId);
      if (player) {
        player.candidates.push(candidate);
      }
    } else {
      let player = session.players.get(playerId);
      if (!player) {
        player = {
          playerId,
          createdAt: Date.now(),
          candidates: [],
        };
        session.players.set(playerId, player);
      }
      player.candidates.push(candidate);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Candidate error:', error);
    return NextResponse.json({ error: 'Failed to add candidate' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const hostToken = searchParams.get('hostToken');
  const afterIndex = searchParams.get('afterIndex');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  const session = sessions.get(roomId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (playerId) {
    const player = session.players.get(playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
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

  return NextResponse.json({ error: 'playerId or hostToken required' }, { status: 400 });
}
