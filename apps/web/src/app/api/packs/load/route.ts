import { NextRequest, NextResponse } from 'next/server';
import { PackLoader, parseGitUrl, getRawContentUrl, PackLoadError } from '@opentriiva/pack-schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parsed = parseGitUrl(url);
    const rawUrl = getRawContentUrl(parsed.owner, parsed.repo, parsed.ref || 'main', '');

    const loader = new PackLoader({ baseUrl: rawUrl });
    const pack = await loader.load();

    return NextResponse.json({
      title: pack.manifest.title,
      author: pack.manifest.author,
      questionCount: pack.questions.length,
      questions: pack.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        answer: { choiceId: q.answer.choiceId },
        media: q.media,
      })),
    });
  } catch (error) {
    if (error instanceof PackLoadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Pack load error:', error);
    return NextResponse.json({ error: 'Failed to load pack' }, { status: 500 });
  }
}
