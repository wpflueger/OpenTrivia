"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useGameStore, type Player } from "@/stores/gameStore";
import { HostWebRTCManager } from "@/lib/webrtc";

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const webrtcRef = useRef<HostWebRTCManager | null>(null);

  const {
    roomId: storeRoomId,
    players,
    questions,
    setRoomId,
    addPlayer,
    removePlayer,
    startGame,
  } = useGameStore();

  const displayRoomId = roomId || storeRoomId;

  const qrValue = "OPENTRIVIA:" + displayRoomId;

  const handlePlayerJoin = useCallback(
    (playerId: string, nickname?: string) => {
      const player: Player = {
        id: playerId,
        nickname: nickname || `Player ${playerId.slice(0, 6)}`,
        isReady: false,
        isConnected: true,
        score: 0,
      };
      addPlayer(player);
    },
    [addPlayer],
  );

  const handlePlayerLeave = useCallback(
    (playerId: string) => {
      removePlayer(playerId);
    },
    [removePlayer],
  );

  const handleMessage = useCallback((playerId: string, data: unknown) => {
    console.log("Received message from", playerId, data);
  }, []);

  useEffect(() => {
    if (roomId) {
      setRoomId(roomId);
      const token = sessionStorage.getItem("hostToken");
      setHostToken(token);
    }
  }, [roomId, setRoomId]);

  useEffect(() => {
    if (displayRoomId && hostToken) {
      const signalingUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";

      webrtcRef.current = new HostWebRTCManager({
        signalingUrl,
        roomId: displayRoomId,
        hostToken: hostToken,
        onPlayerJoin: handlePlayerJoin,
        onPlayerLeave: handlePlayerLeave,
        onMessage: handleMessage,
      });

      webrtcRef.current.start();

      return () => {
        webrtcRef.current?.stop();
      };
    }
  }, [
    displayRoomId,
    hostToken,
    handlePlayerJoin,
    handlePlayerLeave,
    handleMessage,
  ]);

  const handleStartGame = () => {
    startGame();
    router.push("/host/game");
  };

  const handleBack = () => {
    router.push("/host");
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(displayRoomId);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyJoinLink = () => {
    if (typeof window !== "undefined") {
      const joinLink = `${window.location.origin}/join?room=${displayRoomId}`;
      navigator.clipboard.writeText(joinLink);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (!displayRoomId) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <p className="text-cyber-white-dim font-mono">No room specified</p>
          <button
            onClick={handleBack}
            className="mt-4 text-cyber-cyan hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const readyPlayers = players.filter((p) => p.isReady).length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold cyber-glow-text mb-4">
            GAME LOBBY
          </h1>
          <div className="cyber-card inline-block px-8 py-4 rounded-xl">
            <span className="text-sm text-cyber-white-dim font-mono block mb-1">
              ROOM CODE
            </span>
            <span className="cyber-room-code">{displayRoomId}</span>
          </div>
        </div>

        {showQR && (
          <div className="cyber-card p-8 rounded-2xl mb-6">
            <div className="flex flex-col items-center">
              <div className="cyber-qr-container">
                <QRCodeSVG
                  value={qrValue}
                  size={180}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="mt-4 text-sm text-cyber-white-dim text-center font-mono">
                Scan to join
                <br />
                <span className="text-cyber-cyan font-bold">
                  {displayRoomId}
                </span>
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="mt-3 text-sm text-cyber-white-dim hover:text-cyber-cyan transition-colors"
              >
                Hide QR
              </button>
            </div>
          </div>
        )}

        <div className="cyber-card p-8 rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-cyber-white">PLAYERS</h2>
            <span className="text-sm font-mono text-cyber-white-dim">
              {readyPlayers}/{players.length} ready
            </span>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-dashed border-cyber-white-dim flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-cyber-white-dim"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-cyber-white-dim font-mono text-sm">
                Waiting for players to connect...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="cyber-player-card">
                  <div className="flex items-center gap-3">
                    <div className="cyber-avatar w-10 h-10 text-lg">
                      {player.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-cyber-white">
                      {player.nickname}
                    </span>
                  </div>
                  <span
                    className={
                      player.isReady
                        ? "cyber-status-ready"
                        : "cyber-status-waiting"
                    }
                  >
                    {player.isReady ? "READY" : "WAITING"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cyber-card p-4 rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyber-lime rounded-full animate-pulse"></div>
            <span className="text-cyber-white font-mono text-sm">
              <span className="text-cyber-white-dim">QUESTIONS:</span>{" "}
              {questions.length}
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="cyber-button-secondary flex-1 py-3 font-semibold rounded-xl"
          >
            BACK
          </button>
          <button
            onClick={handleStartGame}
            className="cyber-button flex-1 py-3 font-semibold rounded-xl"
          >
            START GAME
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          {!showQR ? (
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-cyber-cyan hover:bg-cyber-cyan/10"
              style={{ border: "1px solid var(--cyber-border)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h1a2 2 0 002-2v-1h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V7a2 2 0 00-2-2H5zm6 7h-1V9a1 1 0 00-1-1H5v1h1v3zm3-4h-2V9a1 1 0 011-1h1v2h-1v1zm1-1V7a1 1 0 011-1h2v1h-1v1z"
                  clipRule="evenodd"
                />
              </svg>
              SHOW QR CODE
            </button>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={handleCopyRoomCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-cyber-white-dim hover:text-cyber-cyan hover:border-cyber-cyan"
              style={{ border: "1px solid var(--cyber-border)" }}
            >
              {copied === "code" ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-cyber-lime"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  COPIED!
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  COPY CODE
                </>
              )}
            </button>
            <button
              onClick={handleCopyJoinLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-cyber-white-dim hover:text-cyber-cyan hover:border-cyber-cyan"
              style={{ border: "1px solid var(--cyber-border)" }}
            >
              {copied === "link" ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-cyber-lime"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  COPIED!
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  COPY LINK
                </>
              )}
            </button>
          </div>

          <p className="text-cyber-white-dim text-center font-mono text-sm">
            Or share:{" "}
            <span className="text-cyber-cyan font-bold">{displayRoomId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyber-cyan border-t-transparent"></div>
      <p className="mt-4 text-xl text-cyber-white-dim font-mono">Loading...</p>
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
