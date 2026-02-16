"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayerWebRTCManager } from "@/lib/webrtc";
import type { ChoiceStats } from "@/lib/answer-stats";

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

interface RevealPayload {
  correctChoiceId: string;
  resultsByPlayer: Record<string, { correct: boolean; score: number }>;
  choiceStats?: ChoiceStats;
}

interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
}

interface AnswerAckPayload {
  accepted: boolean;
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
  answerStatus: "submitted" | "timeout" | null;
  answerDelivery: "pending" | "accepted" | "rejected" | null;
  revealChoiceStats: ChoiceStats;
  revealAnsweredCount: number;
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
    answerStatus: null,
    answerDelivery: null,
    revealChoiceStats: {},
    revealAnsweredCount: 0,
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
        nickname: decodeURIComponent(nickname),
        onMessage: (data: unknown) => {
          const msg = data as {
            type: string;
            payload?:
              | QuestionData
              | RevealPayload
              | LeaderboardEntry[]
              | AnswerAckPayload;
          };
          if (msg.type === "question" && msg.payload) {
            const payload = msg.payload as QuestionData;
            setSelectedChoice(null);
            setState((prev) => ({
              ...prev,
              question: payload,
              phase: "question",
              timeRemaining: Math.floor(payload.durationMs / 1000),
              lastAnswerCorrect: null,
              answerStatus: null,
              answerDelivery: null,
              revealChoiceStats: {},
              revealAnsweredCount: 0,
            }));
          } else if (msg.type === "answer.ack" && msg.payload) {
            const payload = msg.payload as AnswerAckPayload;
            setState((prev) => ({
              ...prev,
              answerDelivery: payload.accepted ? "accepted" : "rejected",
            }));
          } else if (msg.type === "reveal") {
            const payload = msg.payload as RevealPayload | undefined;
            const playerResult = payload?.resultsByPlayer?.[playerId];
            const revealChoiceStats = payload?.choiceStats ?? {};
            const revealAnsweredCount = Object.values(revealChoiceStats).reduce(
              (total, stat) => total + stat.count,
              0,
            );

            setState((prev) => ({
              ...prev,
              phase: "reveal",
              lastAnswerCorrect:
                typeof playerResult?.correct === "boolean"
                  ? playerResult.correct
                  : prev.lastAnswerCorrect,
              score:
                typeof playerResult?.score === "number"
                  ? playerResult.score
                  : prev.score,
              answerStatus: null,
              answerDelivery: null,
              revealChoiceStats,
              revealAnsweredCount,
            }));
          } else if (msg.type === "leaderboard") {
            const payload = msg.payload as LeaderboardEntry[] | undefined;
            const playerEntry = payload?.find((entry) => entry.id === playerId);

            setState((prev) => ({
              ...prev,
              phase: "leaderboard",
              score:
                typeof playerEntry?.score === "number"
                  ? playerEntry.score
                  : prev.score,
              answerStatus: null,
              answerDelivery: null,
            }));
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
      connectionStatus === "disconnected" &&
      state.playerId &&
      state.roomId &&
      state.phase !== "ended"
    ) {
      const reconnectTimer = setTimeout(() => {
        setConnectionStatus("connecting");
        webrtcRef.current?.connect();
      }, 1500);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, state.playerId, state.roomId, state.phase]);

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
            return {
              ...prev,
              phase: "answered",
              timeRemaining: 0,
              answerStatus: "timeout",
            };
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

    setState((prev) => ({
      ...prev,
      phase: "answered",
      lastAnswerCorrect: null,
      answerStatus: "submitted",
      answerDelivery: "pending",
    }));

    webrtcRef.current?.send({
      type: "answer",
      playerId: state.playerId,
      questionId: state.question.id,
      choiceId: selectedChoice,
      timeMs: Math.max(
        0,
        state.question.durationMs - state.timeRemaining * 1000,
      ),
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
          <div className="sr-only" aria-live="polite">
            Question shown. {state.timeRemaining} seconds remaining.
          </div>
          <div className="cyber-card rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-mono text-cyber-white-dim">
                QUESTION
              </span>
              <span
                className={`cyber-timer ${state.timeRemaining <= 5 ? "urgent" : ""}`}
                aria-live="polite"
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
    const selectedChoiceText = state.question?.choices.find(
      (choice) => choice.id === selectedChoice,
    )?.text;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <div className="sr-only" aria-live="assertive">
            {state.answerStatus === "submitted"
              ? state.answerDelivery === "accepted"
                ? "Answer received by host"
                : state.answerDelivery === "rejected"
                  ? "Answer was not accepted"
                  : "Answer sent"
              : "Answer time is over"}
          </div>
          <div className="text-6xl mb-4">
            {state.answerStatus === "submitted" ? "✓" : "⏱"}
          </div>
          <h2 className="text-2xl font-bold cyber-glow-text-lime mb-2">
            {state.answerStatus === "submitted"
              ? "ANSWER SUBMITTED!"
              : "TOO LATE!"}
          </h2>
          <p className="text-xl text-cyber-white-dim font-mono">
            Waiting for host...
          </p>
          {state.answerStatus === "submitted" && (
            <p className="mt-2 text-cyber-white-dim font-mono text-sm">
              {state.answerDelivery === "accepted"
                ? "Answer received by host"
                : state.answerDelivery === "rejected"
                  ? "Answer was not accepted"
                  : "Sending answer..."}
            </p>
          )}
          {state.answerStatus === "submitted" && selectedChoiceText && (
            <p className="mt-3 text-cyber-cyan font-mono text-sm">
              You answered: {selectedChoiceText}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === "reveal") {
    const selectedChoiceStat = selectedChoice
      ? state.revealChoiceStats[selectedChoice]
      : undefined;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <div className="sr-only" aria-live="assertive">
            {state.lastAnswerCorrect ? "Correct answer" : "Wrong answer"}. Score{" "}
            {state.score}.
          </div>
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
          <p className="mt-3 text-cyber-white-dim font-mono text-sm">
            {selectedChoiceStat
              ? `${selectedChoiceStat.percent}% chose your answer`
              : "No answer selected"}
          </p>
          <p className="text-cyber-cyan font-mono text-sm">
            {state.revealAnsweredCount} total answered
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "leaderboard") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold cyber-glow-text mb-2">
            LEADERBOARD
          </h2>
          <p className="text-xl cyber-score mb-2">SCORE: {state.score}</p>
          <p className="text-cyber-white-dim font-mono">
            Next question soon...
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold cyber-glow-text mb-3">GAME OVER</h2>
          <p className="text-2xl cyber-score mb-6">
            FINAL SCORE: {state.score}
          </p>
          <button
            onClick={handleBack}
            className="cyber-button px-6 py-3 rounded-xl"
          >
            BACK TO JOIN
          </button>
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
