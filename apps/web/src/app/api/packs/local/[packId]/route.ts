import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const QUIZZES_PATH = path.join(process.cwd(), "..", "..", "quizzes");

interface Question {
  id: string;
  type: "mcq" | "boolean";
  prompt: string;
  choices: { id: string; text: string }[];
  answer: { choiceId: string };
  media?: { image?: string; audio?: string };
}

interface PackManifest {
  schemaVersion: string;
  title: string;
  description: string;
  author: string;
  license: string;
  rounds: { id: string; questions: { file: string }[] }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { packId: string } },
) {
  try {
    const packId = params.packId;
    const packPath = path.join(QUIZZES_PATH, packId, "pack.json");

    if (!fs.existsSync(packPath)) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    const manifestContent = fs.readFileSync(packPath, "utf-8");
    const manifest: PackManifest = JSON.parse(manifestContent);

    const questions: Question[] = [];

    for (const round of manifest.rounds) {
      for (const questionRef of round.questions) {
        const questionPath = path.join(QUIZZES_PATH, packId, questionRef.file);

        if (fs.existsSync(questionPath)) {
          const questionContent = fs.readFileSync(questionPath, "utf-8");
          const parsed = JSON.parse(questionContent);

          if (Array.isArray(parsed)) {
            questions.push(...parsed);
          } else {
            questions.push(parsed);
          }
        }
      }
    }

    return NextResponse.json({
      title: manifest.title,
      author: manifest.author,
      questionCount: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        answer: { choiceId: q.answer.choiceId },
        media: q.media,
      })),
    });
  } catch (error) {
    console.error("Local pack load error:", error);
    return NextResponse.json({ error: "Failed to load pack" }, { status: 500 });
  }
}
