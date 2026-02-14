'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';

interface QuizPack {
  id: string;
  title: string;
  description: string;
  questionCount: number;
}

const LOCAL_QUIZZES: QuizPack[] = [
  { id: 'general-knowledge', title: 'General Knowledge', description: 'A mix of general knowledge', questionCount: 5 },
  { id: 'science', title: 'Science', description: 'Science and nature', questionCount: 5 },
  { id: 'history', title: 'History', description: 'World history', questionCount: 5 },
  { id: 'sports', title: 'Sports', description: 'Sports trivia', questionCount: 5 },
  { id: 'geography', title: 'Geography', description: 'World geography', questionCount: 5 },
  { id: 'music', title: 'Music', description: 'Music questions', questionCount: 5 },
  { id: 'movies', title: 'Movies', description: 'Film trivia', questionCount: 5 },
  { id: 'food', title: 'Food', description: 'Food and cuisine', questionCount: 5 },
  { id: 'technology', title: 'Technology', description: 'Tech questions', questionCount: 5 },
  { id: 'animals', title: 'Animals', description: 'Animal facts', questionCount: 5 },
];

export default function HostPage() {
  const router = useRouter();
  const [packUrl, setPackUrl] = useState('');
  const [selectedLocalPack, setSelectedLocalPack] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const setQuestions = useGameStore((state) => state.setQuestions);
  const setRoomId = useGameStore((state) => state.setRoomId);

  const handleCreateGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/session/create', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      const { roomId, hostToken } = await response.json();
      
      setRoomId(roomId);
      sessionStorage.setItem('hostToken', hostToken);

      if (selectedLocalPack) {
        const response = await fetch(`/api/packs/local/${selectedLocalPack}`);
        if (!response.ok) {
          throw new Error('Failed to load local pack');
        }
        const data = await response.json();
        setQuestions(data.questions);
      } else if (packUrl) {
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
            <label htmlFor="localPack" className="block text-sm font-medium text-gray-700 mb-2">
              Select Local Quiz
            </label>
            <select
              id="localPack"
              value={selectedLocalPack}
              onChange={(e) => {
                setSelectedLocalPack(e.target.value);
                if (e.target.value) setPackUrl('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select a quiz --</option>
              {LOCAL_QUIZZES.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title} ({quiz.questionCount} questions)
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div>
            <label htmlFor="packUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Load from GitHub URL
            </label>
            <input
              id="packUrl"
              type="url"
              placeholder="https://github.com/user/trivia-pack"
              value={packUrl}
              onChange={(e) => {
                setPackUrl(e.target.value);
                if (e.target.value) setSelectedLocalPack('');
              }}
              disabled={!!selectedLocalPack}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
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
