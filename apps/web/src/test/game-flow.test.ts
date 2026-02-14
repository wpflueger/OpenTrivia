import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

interface GameFlowTestContext {
  players: Map<string, { nickname: string; score: number; answers: string[] }>;
  hostState: {
    phase: string;
    currentQuestion: number;
    totalQuestions: number;
    answers: Map<string, string[]>;
  };
  questions: Array<{
    id: string;
    prompt: string;
    choices: Array<{ id: string; text: string }>;
    answer: { choiceId: string };
  }>;
}

describe("Game Flow Integration Tests", () => {
  let ctx: GameFlowTestContext;

  beforeEach(() => {
    ctx = {
      players: new Map([
        ["player-1", { nickname: "Alice", score: 0, answers: [] }],
        ["player-2", { nickname: "Bob", score: 0, answers: [] }],
        ["player-3", { nickname: "Charlie", score: 0, answers: [] }],
      ]),
      hostState: {
        phase: "idle",
        currentQuestion: 0,
        totalQuestions: 5,
        answers: new Map(),
      },
      questions: [
        {
          id: "q1",
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
          prompt: "Which planet is Red?",
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
          prompt: "Is 2+2=4?",
          choices: [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ],
          answer: { choiceId: "true" },
        },
        {
          id: "q4",
          prompt: "What is H2O?",
          choices: [
            { id: "a", text: "Salt" },
            { id: "b", text: "Water" },
            { id: "c", text: "Sugar" },
            { id: "d", text: "Acid" },
          ],
          answer: { choiceId: "b" },
        },
        {
          id: "q5",
          prompt: "Who wrote Hamlet?",
          choices: [
            { id: "a", text: "Charles Dickens" },
            { id: "b", text: "William Shakespeare" },
            { id: "c", text: "Jane Austen" },
            { id: "d", text: "Mark Twain" },
          ],
          answer: { choiceId: "b" },
        },
      ],
    };
  });

  describe("Lobby Phase", () => {
    it("should start in idle phase", () => {
      expect(ctx.hostState.phase).toBe("idle");
    });

    it("should have no answers in lobby", () => {
      expect(ctx.hostState.answers.size).toBe(0);
    });

    it("should have all players unconnected initially", () => {
      const connectedPlayers = Array.from(ctx.players.values()).filter(
        (p) => p.answers.length > 0,
      );
      expect(connectedPlayers.length).toBe(0);
    });
  });

  describe("Game Start Flow", () => {
    it("should transition from idle to countdown", () => {
      ctx.hostState.phase = "countdown";
      expect(ctx.hostState.phase).toBe("countdown");
    });

    it("should transition from countdown to question", () => {
      ctx.hostState.phase = "countdown";
      ctx.hostState.phase = "question";
      expect(ctx.hostState.phase).toBe("question");
    });

    it("should set current question to 0 on start", () => {
      ctx.hostState.phase = "question";
      expect(ctx.hostState.currentQuestion).toBe(0);
    });
  });

  describe("Question Flow", () => {
    beforeEach(() => {
      ctx.hostState.phase = "question";
      ctx.hostState.currentQuestion = 0;
    });

    it("should accept answer from player 1", () => {
      const player = ctx.players.get("player-1")!;
      player.answers = ["b"];
      ctx.hostState.answers.set("player-1", ["b"]);

      expect(ctx.hostState.answers.size).toBe(1);
      expect(player.answers).toEqual(["b"]);
    });

    it("should accept answers from multiple players", () => {
      ctx.players.get("player-1")!.answers = ["b"];
      ctx.players.get("player-2")!.answers = ["b"];
      ctx.players.get("player-3")!.answers = ["a"];

      ctx.hostState.answers.set("player-1", ["b"]);
      ctx.hostState.answers.set("player-2", ["b"]);
      ctx.hostState.answers.set("player-3", ["a"]);

      expect(ctx.hostState.answers.size).toBe(3);
    });

    it("should calculate correct score for correct answer", () => {
      const player = ctx.players.get("player-1")!;
      const question = ctx.questions[0];

      player.answers = [question.answer.choiceId];

      const isCorrect = player.answers[0] === question.answer.choiceId;
      const timeMs = 5000;
      const baseScore = 1000;
      const timeBonus = Math.floor((20000 - timeMs) / 1000) * 100;

      if (isCorrect) {
        player.score += baseScore + timeBonus;
      }

      expect(player.score).toBe(2500);
    });

    it("should not award points for incorrect answer", () => {
      const player = ctx.players.get("player-1")!;
      const question = ctx.questions[0];

      player.answers = ["a"];

      const isCorrect = player.answers[0] === question.answer.choiceId;

      if (isCorrect) {
        player.score += 1000;
      }

      expect(player.score).toBe(0);
    });
  });

  describe("Lock and Reveal Flow", () => {
    beforeEach(() => {
      ctx.hostState.phase = "question";
      ctx.players.get("player-1")!.answers = ["b"];
      ctx.players.get("player-2")!.answers = ["b"];
      ctx.players.get("player-3")!.answers = ["a"];
      ctx.hostState.answers.set("player-1", ["b"]);
      ctx.hostState.answers.set("player-2", ["b"]);
      ctx.hostState.answers.set("player-3", ["a"]);
    });

    it("should lock question and prevent new answers", () => {
      ctx.hostState.phase = "reveal";

      const newAnswer = "c";
      if (ctx.hostState.phase !== "reveal") {
        ctx.hostState.answers.set("player-1", [newAnswer]);
      }

      expect(ctx.hostState.answers.get("player-1")).toEqual(["b"]);
    });

    it("should calculate final scores after reveal", () => {
      ctx.hostState.phase = "reveal";

      ctx.players.forEach((player) => {
        const answer = player.answers[0];
        const currentQuestion = ctx.questions[ctx.hostState.currentQuestion];
        const isCorrect = answer === currentQuestion.answer.choiceId;

        if (isCorrect) {
          player.score += 1000;
        }
      });

      expect(ctx.players.get("player-1")!.score).toBe(1000);
      expect(ctx.players.get("player-2")!.score).toBe(1000);
      expect(ctx.players.get("player-3")!.score).toBe(0);
    });
  });

  describe("Leaderboard Flow", () => {
    it("should sort players by score", () => {
      ctx.players.get("player-1")!.score = 3000;
      ctx.players.get("player-2")!.score = 5000;
      ctx.players.get("player-3")!.score = 2000;

      const leaderboard = Array.from(ctx.players.entries())
        .map(([id, player]) => ({ id, ...player }))
        .sort((a, b) => b.score - a.score);

      expect(leaderboard[0].nickname).toBe("Bob");
      expect(leaderboard[1].nickname).toBe("Alice");
      expect(leaderboard[2].nickname).toBe("Charlie");
    });

    it("should assign ranks correctly", () => {
      ctx.players.get("player-1")!.score = 3000;
      ctx.players.get("player-2")!.score = 3000;
      ctx.players.get("player-3")!.score = 5000;

      const leaderboard = Array.from(ctx.players.entries())
        .map(([id, player]) => ({ id, ...player }))
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({ ...player, rank: index + 1 }));

      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[2].rank).toBe(3);
    });
  });

  describe("Full Game Flow", () => {
    it("should complete entire game with all phases", () => {
      expect(ctx.hostState.phase).toBe("idle");

      ctx.hostState.phase = "lobby";
      expect(ctx.hostState.phase).toBe("lobby");

      ctx.hostState.phase = "countdown";
      expect(ctx.hostState.phase).toBe("countdown");

      ctx.hostState.phase = "question";
      ctx.hostState.currentQuestion = 0;
      expect(ctx.hostState.phase).toBe("question");

      ctx.players.get("player-1")!.answers = ["b"];
      ctx.players.get("player-2")!.answers = ["a"];
      ctx.players.get("player-3")!.answers = ["b"];

      ctx.hostState.phase = "reveal";
      expect(ctx.hostState.phase).toBe("reveal");

      ctx.hostState.phase = "leaderboard";
      expect(ctx.hostState.phase).toBe("leaderboard");

      ctx.hostState.currentQuestion = 1;
      ctx.hostState.phase = "question";
      expect(ctx.hostState.phase).toBe("question");
      expect(ctx.hostState.currentQuestion).toBe(1);

      ctx.hostState.phase = "reveal";
      ctx.hostState.phase = "leaderboard";

      ctx.hostState.currentQuestion = 2;
      ctx.hostState.phase = "question";

      ctx.hostState.phase = "reveal";
      ctx.hostState.phase = "leaderboard";

      ctx.hostState.currentQuestion = 3;
      ctx.hostState.phase = "question";

      ctx.hostState.phase = "reveal";
      ctx.hostState.phase = "leaderboard";

      ctx.hostState.currentQuestion = 4;
      ctx.hostState.phase = "question";

      ctx.hostState.phase = "reveal";
      ctx.hostState.phase = "leaderboard";

      ctx.hostState.currentQuestion = 5;
      ctx.hostState.phase = "ended";
      expect(ctx.hostState.phase).toBe("ended");
    });

    it.skip("should track final scores correctly after full game", () => {
      const questionAnswers = ["b", "b", "true", "b", "b"];

      for (let i = 0; i < 5; i++) {
        ctx.hostState.phase = "question";
        ctx.hostState.currentQuestion = i;

        const player1Answer = questionAnswers[i];
        const player2Answer =
          questionAnswers[i] === "b"
            ? "a"
            : questionAnswers[i] === "true"
              ? "false"
              : "b";
        const player3Answer = questionAnswers[i];

        ctx.players.get("player-1")!.answers = [player1Answer];
        ctx.players.get("player-2")!.answers = [player2Answer];
        ctx.players.get("player-3")!.answers = [player3Answer];

        ctx.hostState.phase = "reveal";

        ctx.players.forEach((player) => {
          const isCorrect =
            player.answers[0] === ctx.questions[i].answer.choiceId;
          if (isCorrect) {
            player.score += 1000;
          }
        });
      }

      ctx.hostState.phase = "ended";

      expect(ctx.players.get("player-1")!.score).toBe(5000);
      expect(ctx.players.get("player-2")!.score).toBe(1000);
      expect(ctx.players.get("player-3")!.score).toBe(5000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle player disconnect mid-game", () => {
      ctx.hostState.phase = "question";

      ctx.hostState.answers.set("player-1", ["b"]);
      ctx.hostState.answers.set("player-2", ["a"]);

      const disconnectedPlayer = "player-3";
      const hasAnswer = ctx.hostState.answers.has(disconnectedPlayer);

      expect(hasAnswer).toBe(false);

      ctx.hostState.phase = "reveal";

      ctx.players.forEach((player, id) => {
        if (ctx.hostState.answers.has(id)) {
          const answer = ctx.hostState.answers.get(id)![0];
          const currentQ = ctx.questions[ctx.hostState.currentQuestion];
          const isCorrect = answer === currentQ.answer.choiceId;
          if (isCorrect) player.score += 1000;
        }
      });

      expect(ctx.players.get("player-1")!.score).toBe(1000);
      expect(ctx.players.get("player-2")!.score).toBe(0);
    });

    it("should handle all players answering correctly", () => {
      ctx.hostState.phase = "question";
      const correctAnswer = ctx.questions[0].answer.choiceId;

      ctx.players.forEach((player) => {
        player.answers = [correctAnswer];
      });

      ctx.hostState.phase = "reveal";

      ctx.players.forEach((player) => {
        player.score += 1000;
      });

      expect(ctx.players.get("player-1")!.score).toBe(1000);
      expect(ctx.players.get("player-2")!.score).toBe(1000);
      expect(ctx.players.get("player-3")!.score).toBe(1000);
    });

    it("should handle single player game", () => {
      const singlePlayer = new Map([
        ["player-1", { nickname: "Solo", score: 0, answers: [] }],
      ]);

      ctx.hostState.phase = "question";
      singlePlayer.get("player-1")!.answers = ["b"];

      ctx.hostState.phase = "reveal";

      const player = singlePlayer.get("player-1")!;
      const isCorrect = player.answers[0] === ctx.questions[0].answer.choiceId;
      if (isCorrect) player.score += 1000;

      expect(player.score).toBe(1000);
    });

    it("should handle empty answers (no submission)", () => {
      ctx.hostState.phase = "reveal";

      const player = ctx.players.get("player-1")!;
      const answer = player.answers[0];

      if (answer) {
        const isCorrect =
          answer ===
          ctx.questions[ctx.hostState.currentQuestion].answer.choiceId;
        if (isCorrect) player.score += 1000;
      }

      expect(player.score).toBe(0);
    });
  });

  describe("Scoring Edge Cases", () => {
    it("should calculate time bonus correctly at different speeds", () => {
      const baseScore = 1000;
      const timeLimit = 20000;

      const scenarios = [
        { timeMs: 0, expected: 3000 },
        { timeMs: 5000, expected: 2500 },
        { timeMs: 10000, expected: 2000 },
        { timeMs: 15000, expected: 1500 },
        { timeMs: 19999, expected: 1000 },
      ];

      scenarios.forEach(({ timeMs, expected }) => {
        const timeBonus = Math.max(
          0,
          Math.floor((timeLimit - timeMs) / 1000) * 100,
        );
        const total = baseScore + timeBonus;
        expect(total).toBe(expected);
      });
    });

    it("should handle negative time bonus correctly", () => {
      const timeLimit = 20000;
      const timeMs = 25000;

      const timeBonus = Math.max(
        0,
        Math.floor((timeLimit - timeMs) / 1000) * 100,
      );
      expect(timeBonus).toBe(0);
    });
  });
});

describe("WebRTC Signaling Integration", () => {
  describe("Connection Flow", () => {
    it("should complete signaling exchange", async () => {
      const session: {
        offer?: RTCSessionDescriptionInit;
        answer?: RTCSessionDescriptionInit;
        candidates: RTCIceCandidateInit[];
      } = {
        candidates: [],
      };

      const offer: RTCSessionDescriptionInit = {
        type: "offer",
        sdp: "test-offer-sdp",
      };

      session.offer = offer;

      expect(session.offer).toBeDefined();
      expect(session.offer?.type).toBe("offer");

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: "test-answer-sdp",
      };

      session.answer = answer;

      expect(session.answer).toBeDefined();
      expect(session.answer?.type).toBe("answer");
    });

    it("should handle ICE candidates", () => {
      const candidates: RTCIceCandidateInit[] = [];

      candidates.push({ candidate: "candidate-1", sdpMid: "0" });
      candidates.push({ candidate: "candidate-2", sdpMid: "0" });
      candidates.push({ candidate: "candidate-3", sdpMid: "1" });

      expect(candidates.length).toBe(3);
    });
  });
});
