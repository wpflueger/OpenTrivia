"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const roomFromUrl = searchParams.get("room");
    if (roomFromUrl) {
      setRoomCode(roomFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = () => {
    if (!roomCode || !nickname) {
      setError("Please enter room code and nickname");
      return;
    }

    setIsLoading(true);
    setError("");

    const playerId = crypto.randomUUID();
    sessionStorage.setItem("playerId", playerId);
    sessionStorage.setItem("nickname", nickname);
    sessionStorage.setItem("roomCode", roomCode);

    router.push(
      `/player/${roomCode}?playerId=${playerId}&nickname=${encodeURIComponent(nickname)}`,
    );
  };

  return (
    <div className="max-w-lg mx-auto relative z-10">
      <div className="cyber-card rounded-2xl p-8">
        <h1 className="text-3xl font-bold cyber-glow-text mb-6">JOIN GAME</h1>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="roomCode"
              className="block text-sm font-medium text-cyber-white mb-2"
            >
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="cyber-input text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-cyber-white mb-2"
            >
              Your Nickname
            </label>
            <input
              id="nickname"
              type="text"
              placeholder="Enter your name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="cyber-input"
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg border border-cyber-pink bg-cyber-pink/10 text-cyber-pink font-mono text-sm">
              ERROR: {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isLoading || !roomCode || !nickname}
            className="cyber-button w-full py-4 text-lg font-semibold rounded-xl"
          >
            {isLoading ? "JOINING..." : "JOIN GAME"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyber-cyan border-t-transparent"></div>
      <p className="mt-4 text-xl text-cyber-white-dim font-mono">Loading...</p>
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
