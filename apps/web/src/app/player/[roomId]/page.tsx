'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type PlayerPhase = 'connecting' | 'lobby' | 'question' | 'answered' | 'reveal' | 'leaderboard' | 'ended';

interface PlayerState {
  phase: PlayerPhase;
  nickname: string;
  playerId: string;
  roomId: string;
  question: {
    id: string;
    prompt: string;
    choices: { id: string; text: string }[];
    durationMs: number;
  } | null;
  score: number;
  lastAnswerCorrect: boolean | null;
  timeRemaining: number;
}

function PlayerGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<PlayerState>({
    phase: 'connecting',
    nickname: '',
    playerId: '',
    roomId: '',
    question: null,
    score: 0,
    lastAnswerCorrect: null,
    timeRemaining: 0,
  });

  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    const playerId = searchParams.get('playerId');
    const nickname = searchParams.get('nickname');
    const roomId = window.location.pathname.split('/').pop();

    if (playerId && nickname && roomId) {
      setState((prev) => ({
        ...prev,
        playerId,
        nickname: decodeURIComponent(nickname),
        roomId,
        phase: 'lobby',
      }));

      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          question: {
            id: '1',
            prompt: 'What is the capital of France?',
            choices: [
              { id: 'a', text: 'London' },
              { id: 'b', text: 'Paris' },
              { id: 'c', text: 'Berlin' },
              { id: 'd', text: 'Madrid' },
            ],
            durationMs: 20000,
          },
          phase: 'question',
          timeRemaining: 20,
        }));
      }, 3000);
    } else {
      router.push('/join');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (state.phase === 'question' && state.question) {
      const timer = setInterval(() => {
        setState((prev) => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timer);
            return { ...prev, phase: 'answered', timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state.phase, state.question]);

  const handleSelectChoice = (choiceId: string) => {
    if (state.phase !== 'question') return;

    setSelectedChoices([choiceId]);
    setCanSubmit(true);
  };

  const handleSubmit = () => {
    if (selectedChoices.length === 0) return;

    const isCorrect = selectedChoices[0] === 'b';
    const bonus = state.timeRemaining * 50;
    const scoreDelta = isCorrect ? 1000 + bonus : 0;

    setState((prev) => ({
      ...prev,
      phase: 'answered',
      score: prev.score + scoreDelta,
      lastAnswerCorrect: isCorrect,
    }));

    setTimeout(() => {
      setState((prev) => ({ ...prev, phase: 'reveal' }));
    }, 2000);
  };

  if (state.phase === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-xl text-gray-600">Connecting to game...</p>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome, {state.nickname}!</h1>
        <p className="text-xl text-gray-600 mb-8">Room: {state.roomId}</p>
        <div className="animate-pulse bg-primary-100 px-6 py-4 rounded-xl">
          <p className="text-primary-700 font-semibold">Waiting for host to start...</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'question' && state.question) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-600">Question</span>
            <span
              className={`text-2xl font-bold ${
                state.timeRemaining <= 5 ? 'text-red-600' : 'text-primary-600'
              }`}
            >
              {state.timeRemaining}s
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-6">{state.question.prompt}</h2>

          <div className="space-y-3">
            {state.question.choices.map((choice, index) => (
              <button
                key={choice.id}
                onClick={() => handleSelectChoice(choice.id)}
                disabled={state.phase !== 'question'}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selectedChoices.includes(choice.id)
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <span className="font-semibold text-gray-500 mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="text-lg text-gray-800">{choice.text}</span>
              </button>
            ))}
          </div>
        </div>

        {canSubmit && (
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-primary-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-primary-700 transition-colors"
          >
            Submit Answer
          </button>
        )}
      </div>
    );
  }

  if (state.phase === 'answered') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-6xl mb-4">
          {state.lastAnswerCorrect ? '✅' : '⏰'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {state.lastAnswerCorrect ? 'Correct!' : 'Too late!'}
        </h2>
        <p className="text-xl text-gray-600">Waiting for others...</p>
      </div>
    );
  }

  if (state.phase === 'reveal') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-8xl mb-4">
          {state.lastAnswerCorrect ? '🎉' : '😔'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {state.lastAnswerCorrect ? 'Great job!' : 'Better luck next time!'}
        </h2>
        <p className="text-xl text-primary-600 font-semibold">Score: {state.score}</p>
      </div>
    );
  }

  return null;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      <p className="mt-4 text-xl text-gray-600">Loading...</p>
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
