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
  updateSettings: (settings: Partial<GameSettings>) => void;
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
  ) => boolean;
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
      players: state.players.some((p) => p.id === player.id)
        ? state.players.map((existing) =>
            existing.id === player.id
              ? {
                  ...existing,
                  nickname: player.nickname,
                  isConnected: true,
                }
              : existing,
          )
        : [...state.players, player],
      scores: state.scores.has(player.id)
        ? new Map(state.scores)
        : new Map(state.scores).set(player.id, 0),
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

  updateSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),

  setQuestions: (questions) => set({ questions }),

  startGame: () => {
    const state = get();
    const maybeShuffledQuestions = state.settings.shuffleQuestions
      ? [...state.questions].sort(() => Math.random() - 0.5)
      : state.questions;
    const questions = state.settings.shuffleChoices
      ? maybeShuffledQuestions.map((question) => ({
          ...question,
          choices: [...question.choices].sort(() => Math.random() - 0.5),
        }))
      : maybeShuffledQuestions;

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

    if (!question || state.phase !== "question") return false;
    if (questionId && question.id !== questionId) return false;
    if (state.answers.has(playerId)) return false;

    const maxAcceptedTime = state.settings.questionTimeLimit + 1000;
    if (timeMs < 0 || timeMs > maxAcceptedTime) return false;

    const newAnswers = new Map(state.answers);
    newAnswers.set(playerId, choiceIds);

    const isCorrect = choiceIds.includes(question.answer.choiceId);
    const remainingRatio = Math.max(
      0,
      (state.settings.questionTimeLimit - timeMs) /
        state.settings.questionTimeLimit,
    );
    const scoreDelta = isCorrect ? Math.round(1000 * remainingRatio) : 0;

    const newScores = new Map(state.scores);
    newScores.set(playerId, (newScores.get(playerId) || 0) + scoreDelta);

    set({
      answers: newAnswers,
      scores: newScores,
    });

    return true;
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
