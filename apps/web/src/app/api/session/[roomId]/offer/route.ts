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

function getOrCreateSession(roomId: string, hostToken?: string): {
  roomId: string;
  hostToken: string;
  createdAt: number;
  players: Map<string, PlayerConnection>;
} {
  let session = sessions.get(roomId);
  
  if (!session) {
    const newHostToken = Array(32)
      .fill(0)
      .map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62)))
      .join('');
    
    session = {
      roomId,
      hostToken: newHostToken,
      createdAt: Date.now(),
      players: new Map(),
    };
    sessions.set(roomId, session);
  } else if (hostToken && hostToken !== session.hostToken) {
    return session;
  }
  
  return session;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, playerId, offer, hostToken } = body;

    if (!roomId || !offer) {
      return NextResponse.json({ error: 'roomId and offer are required' }, { status: 400 });
    }

    const session = getOrCreateSession(roomId, hostToken);
    
    let player = session.players.get(playerId);
    if (!player) {
      player = {
        playerId: playerId || crypto.randomUUID(),
        createdAt: Date.now(),
        candidates: [],
      };
      session.players.set(player.playerId, player);
    }
    
    player.offer = offer;

    return NextResponse.json({ success: true, playerId: player.playerId });
  } catch (error) {
    console.error('Offer error:', error);
    return NextResponse.json({ error: 'Failed to set offer' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const hostToken = searchParams.get('hostToken');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  const session = sessions.get(roomId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (hostToken !== session.hostToken) {
    return NextResponse.json({ error: 'Invalid host token' }, { status: 403 });
  }

  if (playerId) {
    const player = session.players.get(playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    return NextResponse.json({ offer: player.offer });
  }

  const playerList = Array.from(session.players.values()).map(p => ({
    playerId: p.playerId,
    hasOffer: !!p.offer,
    hasAnswer: !!p.answer,
    createdAt: p.createdAt,
  }));

  return NextResponse.json({ players: playerList });
}
