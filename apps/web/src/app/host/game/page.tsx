"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";
import { HostWebRTCManager } from "@/lib/webrtc";
import { getHostWebRTC, setHostWebRTC } from "@/lib/webrtcStore";
import { buildChoiceStats, type ChoiceStats } from "@/lib/answer-stats";

function getRankDelta(
  previousRanks: Map<string, number> | null,
  playerId: string,
  currentRank: number,
): number | null {
  if (!previousRanks) {
    return null;
  }

  const previousRank = previousRanks.get(playerId);

  if (previousRank === undefined || previousRank === currentRank) {
    return null;
  }

  return previousRank - currentRank;
}

export default function HostGamePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const webrtcRef = useRef<HostWebRTCManager | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousLeaderboardRanksRef = useRef<Map<string, number> | null>(null);
  const [leaderboardRankDeltas, setLeaderboardRankDeltas] = useState<
    Map<string, number | null>
  >(new Map());

  const {
    phase,
    roomId,
    players,
    settings,
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
      const handlePlayerMessage = (playerId: string, data: unknown) => {
        const msg = data as {
          type: string;
          questionId?: string;
          choiceId?: string;
          timeMs?: number;
        };
        const currentQ =
          useGameStore.getState().questions[
            useGameStore.getState().currentQuestionIndex
          ];
        if (msg.type === "answer" && currentQ) {
          const accepted = submitAnswer(
            playerId,
            msg.questionId || currentQ.id,
            [msg.choiceId || ""],
            msg.timeMs || 0,
          );

          webrtc?.send(playerId, {
            type: "answer.ack",
            payload: {
              accepted,
            },
          });
        }
      };

      let webrtc = getHostWebRTC();

      if (!webrtc) {
        const signalingUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";

        webrtc = new HostWebRTCManager({
          signalingUrl,
          roomId: roomIdParam,
          hostToken,
          onMessage: handlePlayerMessage,
        });

        setHostWebRTC(webrtc);
      } else {
        webrtc.setOnMessage(handlePlayerMessage);
      }

      webrtcRef.current = webrtc;
      webrtc.start();
    }

    return () => {
      // Don't stop on unmount - keep WebRTC alive for the session
    };
  }, []);

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
            durationMs: settings.questionTimeLimit,
          },
        });
      }
    }
  }, [
    phase,
    countdown,
    showQuestion,
    currentQuestion,
    settings.questionTimeLimit,
  ]);

  const getSortedLeaderboard = useCallback(() => {
    return [...players]
      .map((p) => ({ ...p, score: scores.get(p.id) || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [players, scores]);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const handleReveal = useCallback(() => {
    if (phase !== "question" || !currentQuestion) {
      return;
    }

    clearRevealTimer();
    lockQuestion();
    revealAnswer();

    const { choiceStats } = buildChoiceStats(currentQuestion.choices, answers);

    if (webrtcRef.current) {
      const resultPlayerIds = new Set<string>([
        ...players.map((player) => player.id),
        ...Array.from(answers.keys()),
        ...webrtcRef.current.getConnectedPlayers(),
      ]);

      const resultsByPlayer = Array.from(resultPlayerIds).reduce<
        Record<string, { correct: boolean; score: number }>
      >((acc, playerId) => {
        const submittedAnswer = answers.get(playerId) ?? [];
        const isCorrect = submittedAnswer.includes(
          currentQuestion.answer.choiceId,
        );

        acc[playerId] = {
          correct: isCorrect,
          score: scores.get(playerId) || 0,
        };

        return acc;
      }, {});

      webrtcRef.current.broadcast({
        type: "reveal",
        payload: {
          correctChoiceId: currentQuestion.answer.choiceId,
          resultsByPlayer,
          choiceStats,
        },
      });
    }

    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      if (currentQuestionIndex < questions.length - 1) {
        if (settings.showLeaderboard) {
          setPhase("leaderboard");
          if (webrtcRef.current) {
            const leaderboard = getSortedLeaderboard();
            webrtcRef.current.broadcast({
              type: "leaderboard",
              payload: leaderboard,
            });
          }
        } else {
          nextQuestion();
          setCountdown(3);
          setPhase("countdown");
        }
      } else {
        endGame();
        if (webrtcRef.current) {
          webrtcRef.current.broadcast({ type: "ended" });
        }
      }
    }, 3000);
  }, [
    phase,
    currentQuestion,
    clearRevealTimer,
    lockQuestion,
    revealAnswer,
    players,
    answers,
    scores,
    currentQuestionIndex,
    questions.length,
    settings.showLeaderboard,
    setPhase,
    nextQuestion,
    getSortedLeaderboard,
    endGame,
  ]);

  useEffect(() => {
    if (phase === "question" && currentQuestion) {
      const duration = settings.questionTimeLimit;
      setQuestionTimeRemaining(Math.floor(duration / 1000));

      const countdownTimer = setInterval(() => {
        setQuestionTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);

      const timer = setTimeout(() => {
        handleReveal();
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownTimer);
      };
    }
  }, [phase, currentQuestion, handleReveal, settings.questionTimeLimit]);

  useEffect(() => {
    if (
      phase === "question" &&
      players.length > 0 &&
      answers.size >= players.length
    ) {
      const timer = setTimeout(() => {
        handleReveal();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, players.length, answers.size, handleReveal]);

  useEffect(() => {
    return () => {
      clearRevealTimer();
    };
  }, [clearRevealTimer]);

  useEffect(() => {
    if (phase !== "leaderboard") {
      return;
    }

    const leaderboard = getSortedLeaderboard();
    const currentRanks = new Map<string, number>();
    const deltas = new Map<string, number | null>();

    leaderboard.forEach((player, index) => {
      const rank = index + 1;
      currentRanks.set(player.id, rank);
      deltas.set(
        player.id,
        getRankDelta(previousLeaderboardRanksRef.current, player.id, rank),
      );
    });

    setLeaderboardRankDeltas(deltas);
    previousLeaderboardRanksRef.current = currentRanks;
  }, [phase, getSortedLeaderboard]);

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
    const liveChoiceCounts = currentQuestion
      ? currentQuestion.choices.reduce<Record<string, number>>(
          (acc, choice) => {
            acc[choice.id] = 0;
            return acc;
          },
          {},
        )
      : {};

    answers.forEach((choiceIds) => {
      choiceIds.forEach((choiceId) => {
        if (liveChoiceCounts[choiceId] !== undefined) {
          liveChoiceCounts[choiceId] += 1;
        }
      });
    });

    const liveChoicePercents = Object.fromEntries(
      Object.entries(liveChoiceCounts).map(([choiceId, count]) => [
        choiceId,
        answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0,
      ]),
    );

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-4xl w-full">
          <div className="sr-only" aria-live="polite">
            Question {currentQuestionIndex + 1}. {answeredCount} of{" "}
            {totalPlayers} answers received. {questionTimeRemaining} seconds
            remaining.
          </div>
          <div className="cyber-card rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-mono text-cyber-white-dim">
                QUESTION {currentQuestionIndex + 1} / {questions.length}
              </span>
              <span className="text-lg font-mono text-cyber-cyan">
                {answeredCount}/{totalPlayers} ANSWERED
              </span>
            </div>

            <div className="mb-4 flex justify-center">
              <span
                className="text-lg font-mono text-cyber-pink"
                aria-live="polite"
              >
                {questionTimeRemaining}s LEFT
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
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono text-cyber-cyan mr-3">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className="text-cyber-white">{choice.text}</span>
                      </div>
                      <span className="font-mono text-cyber-white-dim text-sm">
                        {liveChoiceCounts[choice.id] || 0} votes
                      </span>
                    </div>
                    <div className="h-1.5 bg-cyber-bg-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyber-cyan transition-all duration-300"
                        style={{
                          width: `${liveChoicePercents[choice.id] || 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleReveal}
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
                  cursor: "pointer",
                }}
              >
                REVEAL ANSWERS ({answers.size}/{totalPlayers})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    const correctChoiceId = currentQuestion?.answer.choiceId;
    const { choiceStats, totalAnswered } = currentQuestion
      ? buildChoiceStats(currentQuestion.choices, answers)
      : { choiceStats: {} as ChoiceStats, totalAnswered: 0 };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-4xl w-full">
          <div className="sr-only" aria-live="assertive">
            Correct answer revealed. {totalAnswered} players answered.
          </div>
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

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-cyber-white-dim font-mono text-sm">
                  ANSWER DISTRIBUTION
                </span>
                <span className="text-cyber-cyan font-mono text-sm">
                  {totalAnswered} ANSWERED
                </span>
              </div>
              <div className="space-y-3">
                {currentQuestion?.choices.map((choice, index) => {
                  const stats = choiceStats[choice.id] ?? {
                    count: 0,
                    percent: 0,
                  };
                  const isCorrectChoice = choice.id === correctChoiceId;

                  return (
                    <div key={choice.id}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-cyber-white">
                          <span className="font-mono text-cyber-cyan mr-2">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {choice.text}
                          {isCorrectChoice && (
                            <span className="ml-2 text-cyber-lime font-mono text-xs">
                              CORRECT
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-cyber-white-dim">
                          {stats.count} ({stats.percent}%)
                        </span>
                      </div>
                      <div className="h-2 bg-cyber-bg-light rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${stats.percent}%`,
                            background: isCorrectChoice
                              ? "var(--cyber-lime)"
                              : "var(--cyber-cyan)",
                            boxShadow: isCorrectChoice
                              ? "0 0 8px var(--cyber-lime-glow)"
                              : "0 0 8px var(--cyber-cyan-glow)",
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-cyber-white-dim text-center font-mono text-sm">
            {settings.showLeaderboard
              ? "Leaderboard up next..."
              : "Next question up next..."}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "leaderboard") {
    const leaderboard = getSortedLeaderboard();

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-4xl w-full">
          <div className="sr-only" aria-live="polite">
            Leaderboard shown. Top player is{" "}
            {leaderboard[0]?.nickname ?? "unknown"}.
          </div>
          <div className="cyber-card rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-cyber-white mb-6 text-center">
              LEADERBOARD
            </h2>

            <div className="space-y-3">
              {leaderboard.map((player, index) => {
                const rankDelta = leaderboardRankDeltas.get(player.id) ?? null;

                return (
                  <div key={player.id} className="cyber-leaderboard-row">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-cyber-white-dim w-8 shrink-0">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-cyber-white truncate max-w-[180px]">
                        {player.nickname}
                      </span>
                      <span
                        className={`font-mono text-xs sm:text-sm whitespace-nowrap ${
                          rankDelta === null
                            ? "text-cyber-white-dim"
                            : rankDelta > 0
                              ? "text-cyber-lime"
                              : "text-cyber-pink"
                        }`}
                      >
                        {rankDelta === null
                          ? "• --"
                          : rankDelta > 0
                            ? `↑ +${rankDelta}`
                            : `↓ ${rankDelta}`}
                      </span>
                    </div>
                    <span className="cyber-score">{player.score}</span>
                  </div>
                );
              })}
            </div>
          </div>

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
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    const leaderboard = getSortedLeaderboard();
    const winner = leaderboard[0];
    const totalPlayers = leaderboard.length;
    const totalQuestions = questions.length;
    const highestScore = winner?.score ?? 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-2xl w-full">
          <div className="cyber-card rounded-2xl p-8">
            <h1 className="text-4xl font-bold cyber-glow-text mb-8 text-center">
              GAME OVER
            </h1>

            {winner && (
              <div className="mb-6 rounded-xl border border-cyber-lime/50 bg-cyber-bg-light/60 p-5 text-center">
                <p className="text-cyber-white-dim font-mono text-sm mb-2">
                  WINNER
                </p>
                <p className="text-3xl font-bold text-cyber-lime mb-1">
                  {winner.nickname}
                </p>
                <p className="font-mono text-cyber-white">
                  {winner.score} POINTS
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="rounded-lg bg-cyber-bg-light/60 p-4 text-center">
                <p className="text-xs font-mono text-cyber-white-dim mb-1">
                  PLAYERS
                </p>
                <p className="text-2xl font-bold text-cyber-cyan">
                  {totalPlayers}
                </p>
              </div>
              <div className="rounded-lg bg-cyber-bg-light/60 p-4 text-center">
                <p className="text-xs font-mono text-cyber-white-dim mb-1">
                  QUESTIONS
                </p>
                <p className="text-2xl font-bold text-cyber-cyan">
                  {totalQuestions}
                </p>
              </div>
              <div className="rounded-lg bg-cyber-bg-light/60 p-4 text-center">
                <p className="text-xs font-mono text-cyber-white-dim mb-1">
                  HIGHEST SCORE
                </p>
                <p className="text-2xl font-bold text-cyber-cyan">
                  {highestScore}
                </p>
              </div>
            </div>

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
                    <span className="text-xl font-semibold text-cyber-white truncate max-w-[220px]">
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
