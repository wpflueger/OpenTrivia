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

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const roomId = generateRoomId();
    const hostToken = generateToken();

    sessions.set(roomId, {
      roomId,
      hostToken,
      createdAt: Date.now(),
      players: new Map(),
    });

    return NextResponse.json({ roomId, hostToken });
  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  const session = sessions.get(roomId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const playerList = Array.from(session.players.values()).map(p => ({
    playerId: p.playerId,
    hasOffer: !!p.offer,
    hasAnswer: !!p.answer,
    candidateCount: p.candidates.length,
  }));

  return NextResponse.json({
    roomId: session.roomId,
    hostToken: session.hostToken,
    players: playerList,
  });
}
