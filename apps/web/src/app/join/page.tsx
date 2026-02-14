'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl) {
      setRoomCode(roomFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = () => {
    if (!roomCode || !nickname) {
      setError('Please enter room code and nickname');
      return;
    }

    setIsLoading(true);
    setError('');

    const playerId = crypto.randomUUID();
    sessionStorage.setItem('playerId', playerId);
    sessionStorage.setItem('nickname', nickname);
    sessionStorage.setItem('roomCode', roomCode);

    router.push(`/player/${roomCode}?playerId=${playerId}&nickname=${encodeURIComponent(nickname)}`);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Join a Game</h1>

        <div className="space-y-6">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              Your Nickname
            </label>
            <input
              id="nickname"
              type="text"
              placeholder="Enter your name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isLoading || !roomCode || !nickname}
            className="w-full py-4 bg-primary-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      <p className="mt-4 text-xl text-gray-600">Loading...</p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <JoinContent />
    </Suspense>
  );
}
