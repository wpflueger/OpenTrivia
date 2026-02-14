export type MessageType =
  | 'room.join'
  | 'room.joined'
  | 'room.leave'
  | 'lobby.update'
  | 'game.start'
  | 'game.end'
  | 'question.show'
  | 'question.lock'
  | 'question.reveal'
  | 'answer.submit'
  | 'answer.ack'
  | 'leaderboard.update';

export interface Message<T = unknown> {
  v: number;
  t: MessageType;
  id: string;
  ts: number;
  payload: T;
}

export interface Player {
  id: string;
  nickname: string;
  avatar?: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface RoomJoinPayload {
  nickname: string;
  clientInfo?: {
    platform: string;
    version: string;
  };
}

export interface RoomJoinedPayload {
  playerId: string;
  lobby: LobbyState;
}

export interface LobbyState {
  roomId: string;
  hostId: string;
  players: Player[];
  settings: GameSettings;
  phase: 'lobby' | 'locked';
}

export interface GameSettings {
  questionTimeLimit: number;
  showLeaderboard: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
}

export interface GameStartPayload {
  settings: GameSettings;
  questionCount: number;
  packInfo: PackInfo;
}

export interface PackInfo {
  title: string;
  author: string;
  questionCount: number;
}

export interface QuestionShowPayload {
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  prompt: string;
  choices: Choice[];
  media?: QuestionMedia;
  startTime: number;
  durationMs: number;
}

export interface Choice {
  id: string;
  text: string;
}

export interface QuestionMedia {
  image?: string;
  audio?: string;
}

export interface AnswerSubmitPayload {
  questionId: string;
  selectedChoiceIds: string[];
  submitTime: number;
}

export interface AnswerAckPayload {
  status: 'accepted' | 'late' | 'invalid';
  selectedChoiceIds: string[];
}

export interface QuestionRevealPayload {
  questionId: string;
  correctChoiceIds: string[];
  playerResults: PlayerResult[];
}

export interface PlayerResult {
  playerId: string;
  nickname: string;
  selectedChoiceIds: string[];
  isCorrect: boolean;
  score: number;
  timeMs: number;
}

export interface LeaderboardUpdatePayload {
  entries: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
}

export interface GameEndPayload {
  finalLeaderboard: LeaderboardEntry[];
  totalQuestions: number;
}

export type PayloadForMessageType<T extends MessageType> = T extends 'room.join'
  ? RoomJoinPayload
  : T extends 'room.joined'
  ? RoomJoinedPayload
  : T extends 'lobby.update'
  ? LobbyState
  : T extends 'game.start'
  ? GameStartPayload
  : T extends 'question.show'
  ? QuestionShowPayload
  : T extends 'answer.submit'
  ? AnswerSubmitPayload
  : T extends 'answer.ack'
  ? AnswerAckPayload
  : T extends 'question.reveal'
  ? QuestionRevealPayload
  : T extends 'leaderboard.update'
  ? LeaderboardUpdatePayload
  : T extends 'game.end'
  ? GameEndPayload
  : unknown;

export function createMessage<T extends MessageType>(
  type: T,
  payload: PayloadForMessageType<T>
): Message<PayloadForMessageType<T>> {
  return {
    v: 1,
    t: type,
    id: crypto.randomUUID(),
    ts: Date.now(),
    payload,
  };
}

export * from './validators.js';
