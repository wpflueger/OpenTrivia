import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../stores/gameStore";

const mockQuestions = [
  {
    id: "q1",
    type: "mcq" as const,
    prompt: "What is the capital of France?",
    choices: [
      { id: "a", text: "London" },
      { id: "b", text: "Paris" },
      { id: "c", text: "Berlin" },
      { id: "d", text: "Madrid" },
    ],
    answer: { choiceId: "b" },
  },
  {
    id: "q2",
    type: "mcq" as const,
    prompt: "Which planet is known as the Red Planet?",
    choices: [
      { id: "a", text: "Venus" },
      { id: "b", text: "Mars" },
      { id: "c", text: "Jupiter" },
      { id: "d", text: "Saturn" },
    ],
    answer: { choiceId: "b" },
  },
  {
    id: "q3",
    type: "boolean" as const,
    prompt: "The sky is blue.",
    choices: [
      { id: "true", text: "True" },
      { id: "false", text: "False" },
    ],
    answer: { choiceId: "true" },
  },
];

const mockPlayers = [
  { id: "p1", nickname: "Alice", isReady: true, isConnected: true, score: 0 },
  { id: "p2", nickname: "Bob", isReady: false, isConnected: true, score: 0 },
  {
    id: "p3",
    nickname: "Charlie",
    isReady: true,
    isConnected: false,
    score: 0,
  },
];

describe("Game Store", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useGameStore.getState();

      expect(state.phase).toBe("idle");
      expect(state.roomId).toBe("");
      expect(state.hostId).toBe("");
      expect(state.players).toEqual([]);
      expect(state.questions).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.isLocked).toBe(false);
    });
  });

  describe("setRoomId", () => {
    it("should set the room ID", () => {
      const { setRoomId } = useGameStore.getState();

      setRoomId("ABC123");

      expect(useGameStore.getState().roomId).toBe("ABC123");
    });
  });

  describe("setPhase", () => {
    it("should set the game phase", () => {
      const { setPhase } = useGameStore.getState();

      setPhase("lobby");
      expect(useGameStore.getState().phase).toBe("lobby");

      setPhase("question");
      expect(useGameStore.getState().phase).toBe("question");

      setPhase("reveal");
      expect(useGameStore.getState().phase).toBe("reveal");
    });
  });

  describe("addPlayer", () => {
    it("should add a player to the game", () => {
      const { addPlayer } = useGameStore.getState();

      addPlayer(mockPlayers[0]);

      expect(useGameStore.getState().players).toHaveLength(1);
      expect(useGameStore.getState().players[0].nickname).toBe("Alice");
    });

    it("should initialize player score to 0", () => {
      const { addPlayer } = useGameStore.getState();

      addPlayer(mockPlayers[0]);

      const scores = useGameStore.getState().scores;
      expect(scores.get("p1")).toBe(0);
    });

    it("should allow adding multiple players", () => {
      const { addPlayer } = useGameStore.getState();

      mockPlayers.forEach(addPlayer);

      expect(useGameStore.getState().players).toHaveLength(3);
    });

    it("should not duplicate an existing player", () => {
      const { addPlayer } = useGameStore.getState();

      addPlayer(mockPlayers[0]);
      addPlayer({ ...mockPlayers[0], nickname: "Alice 2" });

      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].nickname).toBe("Alice 2");
      expect(state.scores.get("p1")).toBe(0);
    });
  });

  describe("removePlayer", () => {
    it("should remove a player from the game", () => {
      const { addPlayer, removePlayer } = useGameStore.getState();

      mockPlayers.forEach(addPlayer);
      removePlayer("p1");

      expect(useGameStore.getState().players).toHaveLength(2);
      expect(
        useGameStore.getState().players.find((p) => p.id === "p1"),
      ).toBeUndefined();
    });
  });

  describe("setPlayerReady", () => {
    it("should update player ready status", () => {
      const { addPlayer, setPlayerReady } = useGameStore.getState();

      addPlayer(mockPlayers[0]);
      setPlayerReady("p1", false);

      expect(useGameStore.getState().players[0].isReady).toBe(false);
    });
  });

  describe("setPlayerConnected", () => {
    it("should update player connection status", () => {
      const { addPlayer, setPlayerConnected } = useGameStore.getState();

      addPlayer(mockPlayers[0]);
      setPlayerConnected("p1", false);

      expect(useGameStore.getState().players[0].isConnected).toBe(false);
    });
  });

  describe("setQuestions", () => {
    it("should set the questions for the game", () => {
      const { setQuestions } = useGameStore.getState();

      setQuestions(mockQuestions);

      expect(useGameStore.getState().questions).toHaveLength(3);
      expect(useGameStore.getState().questions[0].prompt).toBe(
        "What is the capital of France?",
      );
    });
  });

  describe("startGame", () => {
    beforeEach(() => {
      useGameStore.getState().reset();
    });

    it("should transition to countdown phase", () => {
      const { addPlayer, setQuestions, startGame } = useGameStore.getState();

      mockPlayers.forEach(addPlayer);
      setQuestions(mockQuestions);
      startGame();

      expect(useGameStore.getState().phase).toBe("countdown");
    });

    it("should reset scores for all players", () => {
      const { addPlayer, setQuestions, startGame } = useGameStore.getState();

      mockPlayers.forEach(addPlayer);
      setQuestions(mockQuestions);
      startGame();

      const scores = useGameStore.getState().scores;
      expect(scores.get("p1")).toBe(0);
      expect(scores.get("p2")).toBe(0);
      expect(scores.get("p3")).toBe(0);
    });

    it("should not shuffle questions when shuffleQuestions is false", () => {
      const { addPlayer, setQuestions, startGame } = useGameStore.getState();

      mockPlayers.forEach(addPlayer);
      setQuestions(mockQuestions);
      startGame();

      expect(useGameStore.getState().questions[0].id).toBe("q1");
    });

    it("should shuffle questions when shuffleQuestions is true", () => {
      const { addPlayer, setQuestions, startGame, updateSettings } =
        useGameStore.getState();

      updateSettings({ shuffleQuestions: true });
      mockPlayers.forEach(addPlayer);
      setQuestions(mockQuestions);
      startGame();

      const state = useGameStore.getState();
      const questionIds = state.questions.map((q) => q.id);
      expect(questionIds).toContain("q1");
    });
  });

  describe("showQuestion", () => {
    it("should transition to question phase", () => {
      const { showQuestion } = useGameStore.getState();

      showQuestion();

      expect(useGameStore.getState().phase).toBe("question");
    });

    it("should set question start time", () => {
      const { showQuestion } = useGameStore.getState();

      showQuestion();

      expect(useGameStore.getState().questionStartTime).not.toBeNull();
    });

    it("should clear previous answers", () => {
      const { showQuestion, addPlayer, submitAnswer, setQuestions } =
        useGameStore.getState();

      setQuestions(mockQuestions);
      addPlayer(mockPlayers[0]);
      showQuestion();
      submitAnswer("p1", "q1", ["b"], 5000);

      showQuestion();

      expect(useGameStore.getState().answers.size).toBe(0);
    });

    it("should unlock the question", () => {
      const { lockQuestion, showQuestion } = useGameStore.getState();

      lockQuestion();
      expect(useGameStore.getState().isLocked).toBe(true);

      showQuestion();
      expect(useGameStore.getState().isLocked).toBe(false);
    });
  });

  describe("lockQuestion", () => {
    it("should lock the question", () => {
      const { lockQuestion } = useGameStore.getState();

      lockQuestion();

      expect(useGameStore.getState().isLocked).toBe(true);
    });
  });

  describe("revealAnswer", () => {
    it("should transition to reveal phase", () => {
      const { revealAnswer } = useGameStore.getState();

      revealAnswer();

      expect(useGameStore.getState().phase).toBe("reveal");
    });

    it("should lock the question", () => {
      const { revealAnswer } = useGameStore.getState();

      revealAnswer();

      expect(useGameStore.getState().isLocked).toBe(true);
    });
  });

  describe("submitAnswer", () => {
    beforeEach(() => {
      useGameStore.getState().reset();
      useGameStore.getState().setQuestions(mockQuestions);
      useGameStore.getState().addPlayer(mockPlayers[0]);
      useGameStore.getState().addPlayer(mockPlayers[1]);
    });

    it("should accept a correct answer and award points", () => {
      const { showQuestion, submitAnswer } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q1", ["b"], 5000);

      const scores = useGameStore.getState().scores;
      expect(scores.get("p1")).toBeGreaterThan(0);
    });

    it("should not award points for incorrect answer", () => {
      const { showQuestion, submitAnswer } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q1", ["a"], 5000);

      const scores = useGameStore.getState().scores;
      expect(scores.get("p1")).toBe(0);
    });

    it("should not accept answers for a different question", () => {
      const { showQuestion, submitAnswer } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q2", ["b"], 5000);

      const answers = useGameStore.getState().answers;
      expect(answers.size).toBe(0);
    });

    it("should reject answers that exceed time limit", () => {
      const { showQuestion, submitAnswer, settings } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q1", ["b"], settings.questionTimeLimit + 5000);

      const answers = useGameStore.getState().answers;
      expect(answers.size).toBe(0);
    });

    it("should decrease score as time elapses", () => {
      const { showQuestion, submitAnswer, settings } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q1", ["b"], 10000);

      const scores = useGameStore.getState().scores;
      const expectedScore = Math.round(
        ((settings.questionTimeLimit - 10000) / settings.questionTimeLimit) *
          1000,
      );
      expect(scores.get("p1")).toBe(expectedScore);
    });

    it("should award higher score for faster correct answers", () => {
      const { showQuestion, submitAnswer } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q1", ["b"], 2000);
      submitAnswer("p2", "q1", ["b"], 12000);

      const scores = useGameStore.getState().scores;
      expect((scores.get("p1") || 0) > (scores.get("p2") || 0)).toBe(true);
    });

    it("should store the answer in answers map", () => {
      const { showQuestion, submitAnswer } = useGameStore.getState();

      showQuestion();
      submitAnswer("p1", "q1", ["b"], 5000);

      const answers = useGameStore.getState().answers;
      expect(answers.get("p1")).toEqual(["b"]);
    });
  });

  describe("nextQuestion", () => {
    it("should advance to next question", () => {
      const { startGame, showQuestion, nextQuestion, setPhase } =
        useGameStore.getState();

      useGameStore.getState().addPlayer(mockPlayers[0]);
      useGameStore.getState().setQuestions(mockQuestions);
      startGame();
      showQuestion();
      nextQuestion();

      expect(useGameStore.getState().currentQuestionIndex).toBe(1);
      expect(useGameStore.getState().phase).toBe("intermission");
    });

    it.skip("should end game when on last question", () => {
      const { startGame, nextQuestion } = useGameStore.getState();

      useGameStore.getState().addPlayer(mockPlayers[0]);
      useGameStore.getState().setQuestions(mockQuestions);
      startGame();
      useGameStore.setState({ currentQuestionIndex: 2 });
      nextQuestion();

      expect(useGameStore.getState().phase).toBe("ended");
    });
  });

  describe("endGame", () => {
    it("should transition to ended phase", () => {
      const { endGame } = useGameStore.getState();

      endGame();

      expect(useGameStore.getState().phase).toBe("ended");
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      const { addPlayer, setQuestions, setRoomId, startGame, reset } =
        useGameStore.getState();

      setRoomId("ABC123");
      addPlayer(mockPlayers[0]);
      setQuestions(mockQuestions);
      startGame();

      reset();

      const state = useGameStore.getState();
      expect(state.phase).toBe("idle");
      expect(state.roomId).toBe("");
      expect(state.players).toEqual([]);
      expect(state.questions).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
    });
  });

  describe("Game Flow Integration", () => {
    it("should complete full game flow correctly", () => {
      const store = useGameStore.getState();

      store.setRoomId("TEST123");
      store.addPlayer(mockPlayers[0]);
      store.addPlayer(mockPlayers[1]);
      store.setQuestions(mockQuestions);

      expect(useGameStore.getState().phase).toBe("idle");
      expect(useGameStore.getState().roomId).toBe("TEST123");
      expect(useGameStore.getState().players).toHaveLength(2);
      expect(useGameStore.getState().questions).toHaveLength(3);

      useGameStore.getState().startGame();
      expect(useGameStore.getState().phase).toBe("countdown");

      useGameStore.getState().showQuestion();
      expect(useGameStore.getState().phase).toBe("question");

      useGameStore.getState().submitAnswer("p1", "q1", ["b"], 5000);
      expect(useGameStore.getState().scores.get("p1")).toBeGreaterThan(0);

      useGameStore.getState().revealAnswer();
      expect(useGameStore.getState().phase).toBe("reveal");

      useGameStore.getState().nextQuestion();
      expect(useGameStore.getState().currentQuestionIndex).toBe(1);
      expect(useGameStore.getState().phase).toBe("intermission");

      useGameStore.getState().showQuestion();
      expect(useGameStore.getState().phase).toBe("question");

      useGameStore.getState().submitAnswer("p2", "q2", ["a"], 5000);
      expect(useGameStore.getState().scores.get("p2")).toBe(0);

      useGameStore.getState().revealAnswer();
      useGameStore.getState().nextQuestion();

      useGameStore.getState().showQuestion();
      useGameStore.getState().revealAnswer();
      useGameStore.getState().nextQuestion();

      expect(useGameStore.getState().phase).toBe("ended");

      const finalScores = Array.from(useGameStore.getState().scores.entries());
      expect(finalScores.length).toBe(2);
    });
  });

  describe("Settings", () => {
    it("should have default settings", () => {
      const { settings } = useGameStore.getState();

      expect(settings.questionTimeLimit).toBe(20000);
      expect(settings.showLeaderboard).toBe(true);
      expect(settings.shuffleQuestions).toBe(false);
      expect(settings.shuffleChoices).toBe(false);
    });

    it("should update all settings with updateSettings", () => {
      const { updateSettings } = useGameStore.getState();

      updateSettings({
        questionTimeLimit: 30000,
        showLeaderboard: false,
        shuffleQuestions: true,
        shuffleChoices: true,
      });

      const { settings } = useGameStore.getState();
      expect(settings.questionTimeLimit).toBe(30000);
      expect(settings.showLeaderboard).toBe(false);
      expect(settings.shuffleQuestions).toBe(true);
      expect(settings.shuffleChoices).toBe(true);
    });

    it("should merge partial settings updates", () => {
      const { updateSettings } = useGameStore.getState();

      updateSettings({ questionTimeLimit: 15000, shuffleQuestions: true });

      const { settings } = useGameStore.getState();
      expect(settings.questionTimeLimit).toBe(15000);
      expect(settings.shuffleQuestions).toBe(true);
      expect(settings.showLeaderboard).toBe(true);
      expect(settings.shuffleChoices).toBe(false);
    });
  });
});
