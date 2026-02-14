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
    const { roomId, playerId, answer, hostToken } = body;

    if (!roomId || !answer) {
      return NextResponse.json({ error: 'roomId and answer are required' }, { status: 400 });
    }

    const session = sessions.get(roomId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (hostToken !== session.hostToken) {
      return NextResponse.json({ error: 'Invalid host token' }, { status: 403 });
    }

    const player = session.players.get(playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    player.answer = answer;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Answer error:', error);
    return NextResponse.json({ error: 'Failed to set answer' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');

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
    return NextResponse.json({ answer: player.answer });
  }

  return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
}
