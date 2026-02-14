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
    const { roomId, candidate } = body;

    if (!roomId || !candidate) {
      return NextResponse.json({ error: 'roomId and candidate are required' }, { status: 400 });
    }

    const session = sessions.get(roomId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    session.candidates.push(candidate);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Candidate error:', error);
    return NextResponse.json({ error: 'Failed to add candidate' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const after = searchParams.get('after');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  const session = sessions.get(roomId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  let candidates = session.candidates;

  if (after) {
    const afterIndex = candidates.indexOf(after);
    if (afterIndex !== -1) {
      candidates = candidates.slice(afterIndex + 1);
    }
  }

  return NextResponse.json({ candidates });
}
