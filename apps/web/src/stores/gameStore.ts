import { create } from "zustand";
import type { Question } from "@opentriiva/pack-schema";

export type GamePhase =
  | "idle"
  | "lobby"
  | "countdown"
  | "question"
  | "reveal"
  | "intermission"
  | "leaderboard"
  | "ended";

export interface Player {
  id: string;
  nickname: string;
  avatar?: string;
  isReady: boolean;
  isConnected: boolean;
  score: number;
}

export interface GameSettings {
  questionTimeLimit: number;
  showLeaderboard: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
}

export interface GameState {
  phase: GamePhase;
  roomId: string;
  hostId: string;
  players: Player[];
  settings: GameSettings;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartTime: number | null;
  answers: Map<string, string[]>;
  scores: Map<string, number>;
  isLocked: boolean;
}

export interface GameActions {
  setRoomId: (roomId: string) => void;
  setPhase: (phase: GamePhase) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setPlayerReady: (playerId: string, isReady: boolean) => void;
  setPlayerConnected: (playerId: string, isConnected: boolean) => void;
  setQuestions: (questions: Question[]) => void;
  startGame: () => void;
  showQuestion: () => void;
  lockQuestion: () => void;
  revealAnswer: () => void;
  submitAnswer: (
    playerId: string,
    questionId: string,
    choiceIds: string[],
    timeMs: number,
  ) => void;
  nextQuestion: () => void;
  endGame: () => void;
  reset: () => void;
}

const initialState: GameState = {
  phase: "idle",
  roomId: "",
  hostId: "",
  players: [],
  settings: {
    questionTimeLimit: 20000,
    showLeaderboard: true,
    shuffleQuestions: false,
    shuffleChoices: false,
  },
  questions: [],
  currentQuestionIndex: 0,
  questionStartTime: null,
  answers: new Map(),
  scores: new Map(),
  isLocked: false,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  setRoomId: (roomId) => set({ roomId }),

  setPhase: (phase) => set({ phase }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
      scores: new Map(state.scores).set(player.id, 0),
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  setPlayerReady: (playerId, isReady) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, isReady } : p,
      ),
    })),

  setPlayerConnected: (playerId, isConnected) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, isConnected } : p,
      ),
    })),

  setQuestions: (questions) => set({ questions }),

  startGame: () => {
    const state = get();
    const questions = state.settings.shuffleQuestions
      ? [...state.questions].sort(() => Math.random() - 0.5)
      : state.questions;

    set({
      phase: "countdown",
      questions,
      currentQuestionIndex: 0,
      scores: new Map(state.players.map((p) => [p.id, 0])),
    });
  },

  showQuestion: () => {
    set({
      phase: "question",
      questionStartTime: Date.now(),
      answers: new Map(),
      isLocked: false,
    });
  },

  lockQuestion: () => set({ isLocked: true }),

  revealAnswer: () => {
    set({ phase: "reveal", isLocked: true });
  },

  submitAnswer: (playerId, questionId, choiceIds, timeMs) => {
    const state = get();
    const question = state.questions[state.currentQuestionIndex];

    if (!question || state.isLocked) return;

    const newAnswers = new Map(state.answers);
    newAnswers.set(playerId, choiceIds);

    const isCorrect = choiceIds.includes(question.answer.choiceId);
    const timeBonus = Math.max(
      0,
      Math.floor((state.settings.questionTimeLimit - timeMs) / 1000) * 100,
    );
    const scoreDelta = isCorrect ? 1000 + timeBonus : 0;

    const newScores = new Map(state.scores);
    newScores.set(playerId, (newScores.get(playerId) || 0) + scoreDelta);

    set({
      answers: newAnswers,
      scores: newScores,
    });
  },

  nextQuestion: () => {
    const state = get();
    const nextIndex = state.currentQuestionIndex + 1;

    if (nextIndex >= state.questions.length) {
      set({ phase: "ended" });
    } else {
      set({
        phase: "intermission",
        currentQuestionIndex: nextIndex,
      });
    }
  },

  endGame: () => set({ phase: "ended" }),

  reset: () => set(initialState),
}));
