'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';

export default function HostPage() {
  const router = useRouter();
  const [packUrl, setPackUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const setQuestions = useGameStore((state) => state.setQuestions);
  const setRoomId = useGameStore((state) => state.setRoomId);

  const generateRoomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      const roomId = generateRoomId();
      setRoomId(roomId);

      if (packUrl) {
        const response = await fetch('/api/packs/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: packUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to load pack');
        }

        const data = await response.json();
        setQuestions(data.questions);
      } else {
        const demoQuestions = [
          {
            id: '1',
            type: 'mcq' as const,
            prompt: 'What is the capital of France?',
            choices: [
              { id: 'a', text: 'London' },
              { id: 'b', text: 'Paris' },
              { id: 'c', text: 'Berlin' },
              { id: 'd', text: 'Madrid' },
            ],
            answer: { choiceId: 'b' },
          },
          {
            id: '2',
            type: 'mcq' as const,
            prompt: 'Which planet is known as the Red Planet?',
            choices: [
              { id: 'a', text: 'Venus' },
              { id: 'b', text: 'Mars' },
              { id: 'c', text: 'Jupiter' },
              { id: 'd', text: 'Saturn' },
            ],
            answer: { choiceId: 'b' },
          },
          {
            id: '3',
            type: 'mcq' as const,
            prompt: 'What is 2 + 2?',
            choices: [
              { id: 'a', text: '3' },
              { id: 'b', text: '4' },
              { id: 'c', text: '5' },
              { id: 'd', text: '6' },
            ],
            answer: { choiceId: 'b' },
          },
        ];
        setQuestions(demoQuestions);
      }

      router.push(`/host/lobby?room=${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Host a Game</h1>

        <div className="space-y-6">
          <div>
            <label htmlFor="packUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Question Pack (optional)
            </label>
            <input
              id="packUrl"
              type="url"
              placeholder="https://github.com/user/trivia-pack"
              value={packUrl}
              onChange={(e) => setPackUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              Leave empty to play with demo questions
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateGame}
            disabled={isLoading}
            className="w-full py-4 bg-primary-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Share the room code with players to join
        </p>
      </div>
    </div>
  );
}
