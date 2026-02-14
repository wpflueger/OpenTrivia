"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore, type GamePhase } from "@/stores/gameStore";
import { HostWebRTCManager } from "@/lib/webrtc";

export default function HostGamePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const webrtcRef = useRef<HostWebRTCManager | null>(null);

  const {
    phase,
    roomId,
    players,
    questions,
    currentQuestionIndex,
    answers,
    scores,
    setPhase,
    showQuestion,
    lockQuestion,
    revealAnswer,
    nextQuestion,
    endGame,
    reset,
    submitAnswer,
  } = useGameStore();

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const hostToken = sessionStorage.getItem("hostToken");
    const roomIdParam = useGameStore.getState().roomId;

    if (hostToken && roomIdParam) {
      const signalingUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";

      webrtcRef.current = new HostWebRTCManager({
        signalingUrl,
        roomId: roomIdParam,
        hostToken,
        onMessage: (playerId: string, data: unknown) => {
          const msg = data as {
            type: string;
            choiceId?: string;
            timeMs?: number;
          };
          if (msg.type === "answer" && currentQuestion) {
            submitAnswer(
              playerId,
              currentQuestion.id,
              [msg.choiceId || ""],
              msg.timeMs || 0,
            );
          }
        },
      });

      webrtcRef.current.start();
    }

    return () => {
      webrtcRef.current?.stop();
    };
  }, [submitAnswer, currentQuestion]);

  useEffect(() => {
    if (phase === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === "countdown" && countdown === 0) {
      showQuestion();
      if (webrtcRef.current && currentQuestion) {
        webrtcRef.current.broadcast({
          type: "question",
          payload: {
            id: currentQuestion.id,
            prompt: currentQuestion.prompt,
            choices: currentQuestion.choices,
            durationMs: currentQuestion.type === "boolean" ? 20000 : 30000,
          },
        });
      }
    }
  }, [phase, countdown, showQuestion, currentQuestion]);

  useEffect(() => {
    if (phase === "question" && currentQuestion) {
      const duration = currentQuestion.type === "boolean" ? 20000 : 30000;
      const timer = setTimeout(() => {
        lockQuestion();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [phase, currentQuestion, lockQuestion]);

  const getSortedLeaderboard = useCallback(() => {
    return [...players]
      .map((p) => ({ ...p, score: scores.get(p.id) || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [players, scores]);

  const handleReveal = () => {
    revealAnswer();

    if (webrtcRef.current) {
      webrtcRef.current.broadcast({ type: "reveal" });
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setPhase("leaderboard");
        if (webrtcRef.current) {
          const leaderboard = getSortedLeaderboard();
          webrtcRef.current.broadcast({
            type: "leaderboard",
            payload: leaderboard,
          });
        }
      } else {
        endGame();
        if (webrtcRef.current) {
          webrtcRef.current.broadcast({ type: "ended" });
        }
      }
    }, 3000);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
      setCountdown(3);
      setPhase("countdown");
    } else {
      endGame();
      if (webrtcRef.current) {
        webrtcRef.current.broadcast({ type: "ended" });
      }
    }
  };

  const handleEndGame = () => {
    endGame();
  };

  const handleExit = () => {
    reset();
    router.push("/");
  };

  if (!currentQuestion && phase !== "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <p className="text-cyber-white-dim font-mono">No questions loaded</p>
          <button
            onClick={handleExit}
            className="mt-4 text-cyber-cyan hover:underline"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
        <div className="text-9xl font-bold cyber-glow-text animate-pulse">
          {countdown}
        </div>
        <p className="mt-4 text-xl text-cyber-white-dim font-mono">
          GET READY!
        </p>
      </div>
    );
  }

  if (phase === "question") {
    const answeredCount = answers.size;
    const totalPlayers = players.length;
    const progressPercent =
      totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-4xl w-full">
          <div className="cyber-card rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-mono text-cyber-white-dim">
                QUESTION {currentQuestionIndex + 1} / {questions.length}
              </span>
              <span className="text-lg font-mono text-cyber-cyan">
                {answeredCount}/{totalPlayers} ANSWERED
              </span>
            </div>

            <div className="mb-6">
              <div className="h-2 bg-cyber-bg-light rounded-full overflow-hidden mb-8">
                <div
                  className="h-full bg-cyber-cyan transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <h2 className="text-3xl font-bold text-cyber-white mb-8">
                {currentQuestion?.prompt}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion?.choices.map((choice, index) => (
                  <div key={choice.id} className="cyber-answer-btn">
                    <span className="font-mono text-cyber-cyan mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-cyber-white">{choice.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={lockQuestion}
                disabled={answers.size === totalPlayers}
                className="px-8 py-3 font-semibold rounded-xl transition-all duration-300"
                style={{
                  background:
                    answers.size === totalPlayers
                      ? "rgba(57, 255, 20, 0.2)"
                      : "var(--cyber-pink)",
                  color:
                    answers.size === totalPlayers
                      ? "var(--cyber-lime)"
                      : "white",
                  border:
                    answers.size === totalPlayers
                      ? "1px solid var(--cyber-lime)"
                      : "none",
                  boxShadow:
                    answers.size === totalPlayers
                      ? "0 0 20px var(--cyber-lime-glow)"
                      : "0 0 20px var(--cyber-pink-glow)",
                  opacity: answers.size === totalPlayers ? 0.7 : 1,
                  cursor:
                    answers.size === totalPlayers ? "not-allowed" : "pointer",
                }}
              >
                LOCK ANSWERS ({answers.size}/{totalPlayers})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reveal" || phase === "leaderboard") {
    const correctChoiceId = currentQuestion?.answer.choiceId;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-4xl w-full">
          <div className="cyber-card rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-cyber-white mb-6 text-center">
              <span className="text-cyber-white-dim font-mono text-sm block mb-2">
                CORRECT ANSWER
              </span>
              {
                currentQuestion?.choices.find((c) => c.id === correctChoiceId)
                  ?.text
              }
            </h2>

            <div className="space-y-3">
              {getSortedLeaderboard().map((player, index) => (
                <div key={player.id} className="cyber-leaderboard-row">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-cyber-white-dim w-8">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-cyber-white">
                      {player.nickname}
                    </span>
                  </div>
                  <span className="cyber-score">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          {phase === "leaderboard" && (
            <div className="flex justify-center">
              <button
                onClick={handleNext}
                className="cyber-button px-8 py-3 font-semibold rounded-xl"
              >
                {currentQuestionIndex < questions.length - 1
                  ? "NEXT QUESTION"
                  : "SEE RESULTS"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    const leaderboard = getSortedLeaderboard();

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-2xl w-full">
          <div className="cyber-card rounded-2xl p-8">
            <h1 className="text-4xl font-bold cyber-glow-text mb-8 text-center">
              GAME OVER
            </h1>

            <div className="space-y-4 mb-8">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`cyber-leaderboard-row ${
                    index === 0
                      ? "gold"
                      : index === 1
                        ? "silver"
                        : index === 2
                          ? "bronze"
                          : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-cyber-white-dim">
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : `#${index + 1}`}
                    </span>
                    <span className="text-xl font-semibold text-cyber-white">
                      {player.nickname}
                    </span>
                  </div>
                  <span className="cyber-score text-3xl">{player.score}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleExit}
              className="cyber-button w-full py-4 font-semibold rounded-xl"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
