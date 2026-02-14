'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, type GamePhase } from '@/stores/gameStore';
import { HostWebRTCManager } from '@/lib/webrtc';

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
    const hostToken = sessionStorage.getItem('hostToken');
    const roomIdParam = useGameStore.getState().roomId;
    
    if (hostToken && roomIdParam) {
      const signalingUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000';

      webrtcRef.current = new HostWebRTCManager({
        signalingUrl,
        roomId: roomIdParam,
        hostToken,
        onMessage: (playerId: string, data: unknown) => {
          const msg = data as { type: string; choiceId?: string; timeMs?: number };
          if (msg.type === 'answer' && currentQuestion) {
            submitAnswer(
              playerId,
              currentQuestion.id,
              [msg.choiceId || ''],
              msg.timeMs || 0
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
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      showQuestion();
      if (webrtcRef.current && currentQuestion) {
        webrtcRef.current.broadcast({
          type: 'question',
          payload: {
            id: currentQuestion.id,
            prompt: currentQuestion.prompt,
            choices: currentQuestion.choices,
            durationMs: currentQuestion.type === 'boolean' ? 20000 : 30000,
          },
        });
      }
    }
  }, [phase, countdown, showQuestion, currentQuestion]);

  useEffect(() => {
    if (phase === 'question' && currentQuestion) {
      const duration = currentQuestion.type === 'boolean' ? 20000 : 30000;
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
      webrtcRef.current.broadcast({ type: 'reveal' });
    }
    
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setPhase('leaderboard');
        if (webrtcRef.current) {
          const leaderboard = getSortedLeaderboard();
          webrtcRef.current.broadcast({ 
            type: 'leaderboard', 
            payload: leaderboard 
          });
        }
      } else {
        endGame();
        if (webrtcRef.current) {
          webrtcRef.current.broadcast({ type: 'ended' });
        }
      }
    }, 3000);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
      setCountdown(3);
      setPhase('countdown');
    } else {
      endGame();
      if (webrtcRef.current) {
        webrtcRef.current.broadcast({ type: 'ended' });
      }
    }
  };

  const handleEndGame = () => {
    endGame();
  };

  const handleExit = () => {
    reset();
    router.push('/');
  };

  if (!currentQuestion && phase !== 'ended') {
    return (
      <div className="text-center">
        <p className="text-gray-600">No questions loaded</p>
        <button onClick={handleExit} className="mt-4 text-primary-600 hover:underline">
          Exit
        </button>
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-9xl font-bold text-primary-600 animate-pulse">{countdown}</div>
        <p className="mt-4 text-xl text-gray-600">Get ready!</p>
      </div>
    );
  }

  if (phase === 'question') {
    const answeredCount = answers.size;
    const totalPlayers = players.length;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-semibold text-gray-600">
              Question {currentQuestionIndex + 1} / {questions.length}
            </span>
            <span className="text-lg font-semibold text-primary-600">
              {answeredCount} / {totalPlayers} answered
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">{currentQuestion?.prompt}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.choices.map((choice, index) => (
                <div
                  key={choice.id}
                  className={`p-4 rounded-xl border-2 ${
                    index % 2 === 0 ? 'border-gray-200' : 'border-gray-200'
                  } bg-gray-50`}
                >
                  <span className="text-2xl font-semibold text-gray-500 mr-3">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-lg text-gray-800">{choice.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={lockQuestion}
              disabled={answers.size === totalPlayers}
              className="px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Lock Answers ({answers.size}/{totalPlayers})
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'reveal' || phase === 'leaderboard') {
    const correctChoiceId = currentQuestion?.answer.choiceId;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Answer: {currentQuestion?.choices.find((c) => c.id === correctChoiceId)?.text}
          </h2>

          <div className="space-y-2">
            {getSortedLeaderboard().map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-8">#{index + 1}</span>
                  <span className="font-medium text-gray-900">{player.nickname}</span>
                </div>
                <span className="text-xl font-bold text-primary-600">{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {phase === 'leaderboard' && (
          <div className="flex justify-center">
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'ended') {
    const leaderboard = getSortedLeaderboard();

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Game Over!</h1>

          <div className="space-y-4 mb-8">
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-6 rounded-xl ${
                  index === 0
                    ? 'bg-yellow-100 border-2 border-yellow-400'
                    : index === 1
                    ? 'bg-gray-100 border-2 border-gray-300'
                    : index === 2
                    ? 'bg-orange-100 border-2 border-orange-300'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-gray-400">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <span className="text-xl font-semibold text-gray-900">{player.nickname}</span>
                </div>
                <span className="text-3xl font-bold text-primary-600">{player.score}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleExit}
            className="w-full py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
