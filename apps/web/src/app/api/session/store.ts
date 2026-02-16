import Redis from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  const useRedisInDev = process.env.ENABLE_REDIS_IN_DEV === "true";
  const shouldUseRedis =
    !!redisUrl && (process.env.NODE_ENV === "production" || useRedisInDev);

  if (shouldUseRedis && redisUrl) {
    try {
      redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 1,
      });

      redis.on("connect", () => console.log("Redis: connected"));
      redis.on("error", (e) => console.log("Redis: error", e.message));

      return redis;
    } catch (e) {
      console.error("Failed to connect to Redis:", e);
      return null;
    }
  }

  if (redisUrl && process.env.NODE_ENV !== "production" && !useRedisInDev) {
    console.log("Redis configured but disabled in dev, using in-memory");
  } else {
    console.log("No Redis URL found, using in-memory");
  }

  return null;
}

interface PlayerConnection {
  playerId: string;
  nickname?: string;
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

const inMemorySessions = new Map<string, Session>();

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

function serializeSession(session: Session): string {
  const obj = {
    roomId: session.roomId,
    hostToken: session.hostToken,
    createdAt: session.createdAt,
    players: Array.from(session.players.entries()),
  };
  return JSON.stringify(obj);
}

function deserializeSession(data: string): Session | null {
  try {
    const obj = JSON.parse(data);
    return {
      ...obj,
      players: new Map(obj.players),
    };
  } catch {
    return null;
  }
}

const SESSION_TTL = 3600 * 4; // 4 hours

async function saveSession(session: Session): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.setex(
      `session:${session.roomId}`,
      SESSION_TTL,
      serializeSession(session),
    );
  } else {
    inMemorySessions.set(session.roomId, session);
  }
}

export async function createSession(): Promise<{
  roomId: string;
  hostToken: string;
}> {
  const roomId = generateRoomId();
  const hostToken = generateToken();

  const session: Session = {
    roomId,
    hostToken,
    createdAt: Date.now(),
    players: new Map(),
  };

  await saveSession(session);

  return { roomId, hostToken };
}

export async function getSession(roomId: string): Promise<Session | undefined> {
  const r = getRedis();
  if (r) {
    const data = await r.get(`session:${roomId}`);
    if (data) {
      return deserializeSession(data) ?? undefined;
    }
    return undefined;
  }
  return inMemorySessions.get(roomId);
}

export async function setPlayerOffer(
  roomId: string,
  playerId: string,
  nickname: string | undefined,
  offer: RTCSessionDescriptionInit,
): Promise<void> {
  const session = await getSession(roomId);
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
  if (nickname) {
    player.nickname = nickname;
  }
  player.offer = offer;

  await saveSession(session);
}

export async function setPlayerAnswer(
  roomId: string,
  playerId: string,
  answer: RTCSessionDescriptionInit,
): Promise<void> {
  const session = await getSession(roomId);
  if (!session) return;

  const player = session.players.get(playerId);
  if (player) {
    player.answer = answer;
    await saveSession(session);
  }
}

export async function addCandidate(
  roomId: string,
  playerId: string,
  candidate: RTCIceCandidateInit,
): Promise<void> {
  const session = await getSession(roomId);
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

  await saveSession(session);
}

export async function getPlayer(
  roomId: string,
  playerId: string,
): Promise<PlayerConnection | undefined> {
  const session = await getSession(roomId);
  if (!session) return undefined;
  return session.players.get(playerId);
}

export async function getAllPlayers(
  roomId: string,
): Promise<PlayerConnection[]> {
  const session = await getSession(roomId);
  if (!session) return [];
  return Array.from(session.players.values());
}

export async function getPlayerList(roomId: string): Promise<
  {
    playerId: string;
    nickname?: string;
    hasOffer: boolean;
    hasAnswer: boolean;
    candidateCount: number;
  }[]
> {
  const session = await getSession(roomId);
  if (!session) return [];
  return Array.from(session.players.values()).map((p) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    hasOffer: !!p.offer,
    hasAnswer: !!p.answer,
    candidateCount: p.candidates.length,
  }));
}
