"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayerWebRTCManager } from "@/lib/webrtc";

type PlayerPhase =
  | "connecting"
  | "lobby"
  | "question"
  | "answered"
  | "reveal"
  | "leaderboard"
  | "ended";

interface QuestionData {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[];
  durationMs: number;
}

interface PlayerState {
  phase: PlayerPhase;
  nickname: string;
  playerId: string;
  roomId: string;
  question: QuestionData | null;
  score: number;
  lastAnswerCorrect: boolean | null;
  timeRemaining: number;
}

function PlayerGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const webrtcRef = useRef<PlayerWebRTCManager | null>(null);

  const [state, setState] = useState<PlayerState>({
    phase: "connecting",
    nickname: "",
    playerId: "",
    roomId: "",
    question: null,
    score: 0,
    lastAnswerCorrect: null,
    timeRemaining: 0,
  });

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  useEffect(() => {
    const playerId = searchParams.get("playerId");
    const nickname = searchParams.get("nickname");
    const roomId =
      typeof window !== "undefined"
        ? window.location.pathname.split("/").pop()
        : "";

    if (playerId && nickname && roomId) {
      setState((prev) => ({
        ...prev,
        playerId,
        nickname: decodeURIComponent(nickname),
        roomId,
      }));

      const signalingUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";

      webrtcRef.current = new PlayerWebRTCManager({
        signalingUrl,
        roomId,
        playerId,
        onMessage: (data: unknown) => {
          const msg = data as { type: string; payload?: QuestionData };
          if (msg.type === "question" && msg.payload) {
            setState((prev) => ({
              ...prev,
              question: msg.payload || null,
              phase: "question",
              timeRemaining: Math.floor(
                (msg.payload?.durationMs || 20000) / 1000,
              ),
            }));
          } else if (msg.type === "reveal") {
            setState((prev) => ({ ...prev, phase: "reveal" }));
          } else if (msg.type === "leaderboard") {
            setState((prev) => ({ ...prev, phase: "leaderboard" }));
          } else if (msg.type === "ended") {
            setState((prev) => ({ ...prev, phase: "ended" }));
          }
        },
        onConnected: () => {
          setConnectionStatus("connected");
          setState((prev) => ({ ...prev, phase: "lobby" }));
        },
        onDisconnected: () => {
          setConnectionStatus("disconnected");
        },
      });

      setConnectionStatus("connecting");
      webrtcRef.current.connect();
    } else {
      router.push("/join");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (
      state.phase === "question" &&
      state.question &&
      state.timeRemaining > 0
    ) {
      const timer = setInterval(() => {
        setState((prev) => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timer);
            return { ...prev, phase: "answered", timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state.phase, state.question, state.timeRemaining]);

  const handleSelectChoice = (choiceId: string) => {
    if (state.phase !== "question") return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (!selectedChoice || state.phase !== "question" || !state.question)
      return;

    const isCorrect =
      selectedChoice ===
      state.question.choices.find(
        (c) => c.id === state.question?.choices[0]?.id,
      )?.id
        ? false
        : true;

    const bonus = state.timeRemaining * 50;
    const scoreDelta = isCorrect ? 1000 + bonus : 0;

    setState((prev) => ({
      ...prev,
      phase: "answered",
      score: prev.score + scoreDelta,
      lastAnswerCorrect: isCorrect,
    }));

    webrtcRef.current?.send({
      type: "answer",
      playerId: state.playerId,
      choiceId: selectedChoice,
      timeMs: state.question.durationMs - state.timeRemaining * 1000,
    });
  };

  const handleBack = () => {
    webrtcRef.current?.disconnect();
    router.push("/join");
  };

  if (state.phase === "connecting" || connectionStatus === "connecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyber-cyan border-t-transparent"></div>
        <p className="mt-4 text-xl text-cyber-white-dim font-mono">
          CONNECTING...
        </p>
      </div>
    );
  }

  if (state.phase === "lobby") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-md mx-auto text-center">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-glow-pulse"
            style={{
              background:
                "linear-gradient(135deg, var(--cyber-lime-dim), var(--cyber-lime))",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-cyber-bg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold cyber-glow-text-lime mb-2">
            CONNECTED!
          </h1>
          <p className="text-cyber-white-dim font-mono mb-2">
            Room: <span className="text-cyber-cyan">{state.roomId}</span>
          </p>
          <p className="text-cyber-white-dim mb-6">
            Waiting for host to start...
          </p>

          <div className="cyber-card p-4 rounded-xl">
            <p className="text-sm text-cyber-white-dim">
              <span className="text-cyber-cyan">TIP:</span> Watch the host
              screen for questions, then tap your answer here!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "question" && state.question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-lg w-full">
          <div className="cyber-card rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-mono text-cyber-white-dim">
                QUESTION
              </span>
              <span
                className={`cyber-timer ${state.timeRemaining <= 5 ? "urgent" : ""}`}
              >
                {state.timeRemaining}s
              </span>
            </div>

            <h2 className="text-xl font-bold text-cyber-white mb-6">
              {state.question.prompt}
            </h2>

            <div className="space-y-3">
              {state.question.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => handleSelectChoice(choice.id)}
                  disabled={state.phase !== "question"}
                  className={`cyber-answer-btn ${selectedChoice === choice.id ? "selected" : ""}`}
                >
                  <span className="font-mono text-cyber-cyan mr-3">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="text-cyber-white">{choice.text}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedChoice && state.phase === "question" && (
            <button
              onClick={handleSubmit}
              className="cyber-button w-full py-4 text-lg font-semibold rounded-xl"
            >
              SUBMIT ANSWER
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === "answered") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {state.lastAnswerCorrect ? "✓" : "⏱"}
          </div>
          <h2 className="text-2xl font-bold cyber-glow-text-lime mb-2">
            {state.lastAnswerCorrect ? "ANSWER SUBMITTED!" : "TOO LATE!"}
          </h2>
          <p className="text-xl text-cyber-white-dim font-mono">
            Waiting for host...
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "reveal") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <div className="text-8xl mb-4">
            {state.lastAnswerCorrect ? "🎉" : "😔"}
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{
              color: state.lastAnswerCorrect
                ? "var(--cyber-lime)"
                : "var(--cyber-pink)",
            }}
          >
            {state.lastAnswerCorrect ? "CORRECT!" : "WRONG!"}
          </h2>
          <p className="text-xl cyber-score">SCORE: {state.score}</p>
        </div>
      </div>
    );
  }

  return null;
}

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyber-cyan border-t-transparent"></div>
      <p className="mt-4 text-xl text-cyber-white-dim font-mono">Loading...</p>
    </div>
  );
}

export default function PlayerGamePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PlayerGameContent />
    </Suspense>
  );
}
