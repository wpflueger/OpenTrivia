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
    const { roomId, answer } = body;

    if (!roomId || !answer) {
      return NextResponse.json({ error: 'roomId and answer are required' }, { status: 400 });
    }

    const session = sessions.get(roomId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    session.answer = answer;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Answer error:', error);
    return NextResponse.json({ error: 'Failed to set answer' }, { status: 500 });
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

  return NextResponse.json({ answer: session.answer });
}
