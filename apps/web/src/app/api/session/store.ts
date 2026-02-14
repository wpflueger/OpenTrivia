interface PlayerConnection {
  playerId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidates: RTCIceCandidateInit[];
  createdAt: number;
}

export interface Session {
  roomId: string;
  hostToken: string;
  createdAt: number;
  players: Map<string, PlayerConnection>;
}

const sessions = new Map<string, Session>();

function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createSession(): { roomId: string; hostToken: string } {
  const roomId = generateRoomId();
  const hostToken = generateToken();

  sessions.set(roomId, {
    roomId,
    hostToken,
    createdAt: Date.now(),
    players: new Map(),
  });

  return { roomId, hostToken };
}

export function getSession(roomId: string): Session | undefined {
  return sessions.get(roomId);
}

export function getOrCreatePlayer(
  roomId: string,
  playerId: string,
): PlayerConnection | undefined {
  const session = sessions.get(roomId);
  if (!session) return undefined;

  let player = session.players.get(playerId);
  if (!player) {
    player = {
      playerId,
      createdAt: Date.now(),
      candidates: [],
    };
    session.players.set(playerId, player);
  }
  return player;
}

export function setPlayerOffer(
  roomId: string,
  playerId: string,
  offer: RTCSessionDescriptionInit,
): void {
  const session = sessions.get(roomId);
  if (!session) return;

  let player = session.players.get(playerId);
  if (!player) {
    player = {
      playerId,
      createdAt: Date.now(),
      candidates: [],
    };
    session.players.set(playerId, player);
  }
  player.offer = offer;
}

export function setPlayerAnswer(
  roomId: string,
  playerId: string,
  answer: RTCSessionDescriptionInit,
): void {
  const session = sessions.get(roomId);
  if (!session) return;

  const player = session.players.get(playerId);
  if (player) {
    player.answer = answer;
  }
}

export function addCandidate(
  roomId: string,
  playerId: string,
  candidate: RTCIceCandidateInit,
): void {
  const session = sessions.get(roomId);
  if (!session) return;

  let player = session.players.get(playerId);
  if (!player) {
    player = {
      playerId,
      createdAt: Date.now(),
      candidates: [],
    };
    session.players.set(playerId, player);
  }
  player.candidates.push(candidate);
}

export function getPlayer(
  roomId: string,
  playerId: string,
): PlayerConnection | undefined {
  const session = sessions.get(roomId);
  if (!session) return undefined;
  return session.players.get(playerId);
}

export function getAllPlayers(roomId: string): PlayerConnection[] {
  const session = sessions.get(roomId);
  if (!session) return [];
  return Array.from(session.players.values());
}

export function getPlayerList(roomId: string): {
  playerId: string;
  hasOffer: boolean;
  hasAnswer: boolean;
  candidateCount: number;
}[] {
  const session = sessions.get(roomId);
  if (!session) return [];
  return Array.from(session.players.values()).map((p) => ({
    playerId: p.playerId,
    hasOffer: !!p.offer,
    hasAnswer: !!p.answer,
    candidateCount: p.candidates.length,
  }));
}
