'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import type { Player } from '@/stores/gameStore';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');

  const {
    roomId: storeRoomId,
    players,
    questions,
    setRoomId,
    addPlayer,
    startGame,
  } = useGameStore();

  useEffect(() => {
    if (roomId) {
      setRoomId(roomId);
    }
  }, [roomId, setRoomId]);

  useEffect(() => {
    const demoPlayers: Player[] = [
      { id: 'demo-1', nickname: 'Alice', isReady: true, isConnected: true, score: 0 },
      { id: 'demo-2', nickname: 'Bob', isReady: false, isConnected: true, score: 0 },
    ];
    demoPlayers.forEach(addPlayer);
  }, [addPlayer]);

  const handleStartGame = () => {
    startGame();
    router.push('/host/game');
  };

  const handleBack = () => {
    router.push('/host');
  };

  if (!roomId && !storeRoomId) {
    return (
      <div className="text-center">
        <p className="text-gray-600">No room specified</p>
        <button onClick={handleBack} className="mt-4 text-primary-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const readyPlayers = players.filter((p) => p.isReady).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Lobby</h1>
          <div className="inline-block px-6 py-3 bg-primary-100 rounded-lg">
            <span className="text-sm text-gray-600">Room Code: </span>
            <span className="text-2xl font-bold text-primary-700 tracking-wider">
              {roomId || storeRoomId}
            </span>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Players ({readyPlayers}/{players.length} ready)
          </h2>

          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Waiting for players to join...</p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold">
                        {player.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{player.nickname}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      player.isReady
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {player.isReady ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Questions:</strong> {questions.length}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleStartGame}
            disabled={players.length === 0 || readyPlayers === 0}
            className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Share the room code with friends to join!
        </p>
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

export default function HostLobbyPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LobbyContent />
    </Suspense>
  );
}
