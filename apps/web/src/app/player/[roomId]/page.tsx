'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlayerWebRTCManager } from '@/lib/webrtc';

type PlayerPhase = 'connecting' | 'lobby' | 'question' | 'answered' | 'reveal' | 'leaderboard' | 'ended';

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
    phase: 'connecting',
    nickname: '',
    playerId: '',
    roomId: '',
    question: null,
    score: 0,
    lastAnswerCorrect: null,
    timeRemaining: 0,
  });

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  useEffect(() => {
    const playerId = searchParams.get('playerId');
    const nickname = searchParams.get('nickname');
    const roomId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';

    if (playerId && nickname && roomId) {
      setState((prev) => ({
        ...prev,
        playerId,
        nickname: decodeURIComponent(nickname),
        roomId,
      }));

      const signalingUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      
      webrtcRef.current = new PlayerWebRTCManager({
        signalingUrl,
        roomId,
        playerId,
        onMessage: (data: unknown) => {
          const msg = data as { type: string; payload?: QuestionData };
          if (msg.type === 'question' && msg.payload) {
            setState((prev) => ({
              ...prev,
              question: msg.payload || null,
              phase: 'question',
              timeRemaining: Math.floor((msg.payload?.durationMs || 20000) / 1000),
            }));
          } else if (msg.type === 'reveal') {
            setState((prev) => ({ ...prev, phase: 'reveal' }));
          } else if (msg.type === 'leaderboard') {
            setState((prev) => ({ ...prev, phase: 'leaderboard' }));
          } else if (msg.type === 'ended') {
            setState((prev) => ({ ...prev, phase: 'ended' }));
          }
        },
        onConnected: () => {
          setConnectionStatus('connected');
          setState((prev) => ({ ...prev, phase: 'lobby' }));
        },
        onDisconnected: () => {
          setConnectionStatus('disconnected');
        },
      });

      setConnectionStatus('connecting');
      webrtcRef.current.connect();
    } else {
      router.push('/join');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (state.phase === 'question' && state.question && state.timeRemaining > 0) {
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
  }, [state.phase, state.question, state.timeRemaining]);

  const handleSelectChoice = (choiceId: string) => {
    if (state.phase !== 'question') return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (!selectedChoice || state.phase !== 'question' || !state.question) return;

    const isCorrect = selectedChoice === state.question.choices.find(c => 
      c.id === state.question?.choices[0]?.id
    )?.id ? false : true;
    
    const bonus = state.timeRemaining * 50;
    const scoreDelta = isCorrect ? 1000 + bonus : 0;

    setState((prev) => ({
      ...prev,
      phase: 'answered',
      score: prev.score + scoreDelta,
      lastAnswerCorrect: isCorrect,
    }));

    webrtcRef.current?.send({
      type: 'answer',
      playerId: state.playerId,
      choiceId: selectedChoice,
      timeMs: (state.question.durationMs - state.timeRemaining * 1000),
    });
  };

  const handleBack = () => {
    webrtcRef.current?.disconnect();
    router.push('/join');
  };

  if (state.phase === 'connecting' || connectionStatus === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-xl text-gray-600">Connecting to game...</p>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Connected!</h1>
        <p className="text-gray-600 mb-4">Room: <span className="font-bold">{state.roomId}</span></p>
        <p className="text-gray-600 mb-6">Waiting for host to start the game...</p>
        
        <div className="bg-primary-50 p-4 rounded-xl w-full">
          <p className="text-sm text-primary-800">
            <strong>Tip:</strong> Watch the host's screen for questions, then tap your answer here!
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === 'question' && state.question) {
    return (
      <div className="max-w-lg mx-auto px-4">
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
                  selectedChoice === choice.id
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

        {selectedChoice && state.phase === 'question' && (
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
          {state.lastAnswerCorrect ? 'Answer Submitted!' : 'Too late!'}
        </h2>
        <p className="text-xl text-gray-600">Waiting for host...</p>
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
          {state.lastAnswerCorrect ? 'Correct!' : 'Wrong answer'}
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
