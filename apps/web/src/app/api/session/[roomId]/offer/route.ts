import { NextRequest, NextResponse } from 'next/server';

const sessions = new Map<
  string,
  {
    roomId: string;
    hostToken: string;
    createdAt: number;
    offer?: string;
    answer?: string;
    candidates: string[];
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, offer, hostToken } = body;

    if (!roomId || !offer) {
      return NextResponse.json({ error: 'roomId and offer are required' }, { status: 400 });
    }

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
        offer,
        candidates: [],
      };
      sessions.set(roomId, session);
    } else if (hostToken !== session.hostToken) {
      session.offer = offer;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Offer error:', error);
    return NextResponse.json({ error: 'Failed to set offer' }, { status: 500 });
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

  return NextResponse.json({ offer: session.offer });
}
