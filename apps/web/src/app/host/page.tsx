"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";

interface QuizPack {
  id: string;
  title: string;
  description: string;
  questionCount: number;
}

const LOCAL_QUIZZES: QuizPack[] = [
  {
    id: "general-knowledge",
    title: "General Knowledge",
    description: "A mix of general knowledge",
    questionCount: 5,
  },
  {
    id: "science",
    title: "Science",
    description: "Science and nature",
    questionCount: 5,
  },
  {
    id: "history",
    title: "History",
    description: "World history",
    questionCount: 5,
  },
  {
    id: "sports",
    title: "Sports",
    description: "Sports trivia",
    questionCount: 5,
  },
  {
    id: "geography",
    title: "Geography",
    description: "World geography",
    questionCount: 5,
  },
  {
    id: "music",
    title: "Music",
    description: "Music questions",
    questionCount: 5,
  },
  {
    id: "movies",
    title: "Movies",
    description: "Film trivia",
    questionCount: 5,
  },
  {
    id: "food",
    title: "Food",
    description: "Food and cuisine",
    questionCount: 5,
  },
  {
    id: "technology",
    title: "Technology",
    description: "Tech questions",
    questionCount: 5,
  },
  {
    id: "animals",
    title: "Animals",
    description: "Animal facts",
    questionCount: 5,
  },
];

export default function HostPage() {
  const router = useRouter();
  const [packUrl, setPackUrl] = useState("");
  const [selectedLocalPack, setSelectedLocalPack] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const setQuestions = useGameStore((state) => state.setQuestions);
  const setRoomId = useGameStore((state) => state.setRoomId);

  const handleCreateGame = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session/create", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to create session");
      }
      const { roomId, hostToken } = await response.json();

      setRoomId(roomId);
      sessionStorage.setItem("hostToken", hostToken);

      if (selectedLocalPack) {
        const response = await fetch(`/api/packs/local/${selectedLocalPack}`);
        if (!response.ok) {
          throw new Error("Failed to load local pack");
        }
        const data = await response.json();
        setQuestions(data.questions);
      } else if (packUrl) {
        const response = await fetch("/api/packs/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: packUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to load pack");
        }

        const data = await response.json();
        setQuestions(data.questions);
      } else {
        const demoQuestions = [
          {
            id: "1",
            type: "mcq" as const,
            prompt: "What is the capital of France?",
            choices: [
              { id: "a", text: "London" },
              { id: "b", text: "Paris" },
              { id: "c", text: "Berlin" },
              { id: "d", text: "Madrid" },
            ],
            answer: { choiceId: "b" },
          },
          {
            id: "2",
            type: "mcq" as const,
            prompt: "Which planet is known as the Red Planet?",
            choices: [
              { id: "a", text: "Venus" },
              { id: "b", text: "Mars" },
              { id: "c", text: "Jupiter" },
              { id: "d", text: "Saturn" },
            ],
            answer: { choiceId: "b" },
          },
          {
            id: "3",
            type: "mcq" as const,
            prompt: "What is 2 + 2?",
            choices: [
              { id: "a", text: "3" },
              { id: "b", text: "4" },
              { id: "c", text: "5" },
              { id: "d", text: "6" },
            ],
            answer: { choiceId: "b" },
          },
        ];
        setQuestions(demoQuestions);
      }

      router.push(`/host/lobby?room=${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold cyber-glow-text mb-2">HOST GAME</h1>
          <p className="text-cyber-white-dim font-mono text-sm">
            Create a new trivia session
          </p>
        </div>

        <div className="cyber-card rounded-2xl p-8">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="localPack"
                className="block text-sm font-medium text-cyber-white mb-2"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyber-cyan rounded-full"></span>
                  Select Quiz Pack
                </span>
              </label>
              <select
                id="localPack"
                value={selectedLocalPack}
                onChange={(e) => {
                  setSelectedLocalPack(e.target.value);
                  if (e.target.value) setPackUrl("");
                }}
                className="cyber-select"
              >
                <option value="">-- Choose a quiz --</option>
                {LOCAL_QUIZZES.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title} ({quiz.questionCount} Q)
                  </option>
                ))}
              </select>
            </div>

            <div className="cyber-divider">
              <span>OR</span>
            </div>

            <div>
              <label
                htmlFor="packUrl"
                className="block text-sm font-medium text-cyber-white mb-2"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyber-lime rounded-full"></span>
                  Load from GitHub
                </span>
              </label>
              <input
                id="packUrl"
                type="url"
                placeholder="https://github.com/user/trivia-pack"
                value={packUrl}
                onChange={(e) => {
                  setPackUrl(e.target.value);
                  if (e.target.value) setSelectedLocalPack("");
                }}
                disabled={!!selectedLocalPack}
                className="cyber-input"
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg border border-cyber-pink bg-cyber-pink/10 text-cyber-pink">
                <span className="font-mono text-sm">ERROR: {error}</span>
              </div>
            )}

            <button
              onClick={handleCreateGame}
              disabled={isLoading}
              className="cyber-button w-full py-4 text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  INITIALIZING...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                      clipRule="evenodd"
                    />
                  </svg>
                  CREATE GAME
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-cyber-white-dim text-sm font-mono">
            Share the room code with players to join
          </p>
        </div>
      </div>
    </div>
  );
}
