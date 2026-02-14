import { describe, it, expect } from "vitest";
import {
  validateMessageEnvelope,
  validateRoomJoinPayload,
  validateAnswerSubmitPayload,
  validatePlayer,
  validateGameSettings,
  validateChoice,
  validateQuestionShowPayload,
} from "../src/validators";

describe("validateMessageEnvelope", () => {
  it("should validate a correct message", () => {
    const message = {
      v: 1,
      t: "room.join",
      id: "123",
      ts: 1234567890,
      payload: { nickname: "test" },
    };
    expect(validateMessageEnvelope(message)).toBe(true);
  });

  it("should reject message with invalid version", () => {
    const message = {
      v: 2,
      t: "room.join",
      id: "123",
      ts: 1234567890,
      payload: {},
    };
    expect(validateMessageEnvelope(message)).toBe(false);
  });

  it("should reject message with invalid type", () => {
    const message = {
      v: 1,
      t: "invalid.type",
      id: "123",
      ts: 1234567890,
      payload: {},
    };
    expect(validateMessageEnvelope(message)).toBe(false);
  });

  it("should reject non-object message", () => {
    expect(validateMessageEnvelope(null)).toBe(false);
    expect(validateMessageEnvelope("string")).toBe(false);
    expect(validateMessageEnvelope(123)).toBe(false);
  });
});

describe("validateRoomJoinPayload", () => {
  it("should validate correct payload", () => {
    const payload = { nickname: "TestPlayer" };
    expect(validateRoomJoinPayload(payload)).toBe(true);
  });

  it("should reject empty nickname", () => {
    const payload = { nickname: "" };
    expect(validateRoomJoinPayload(payload)).toBe(false);
  });

  it("should reject nickname too long", () => {
    const payload = { nickname: "a".repeat(21) };
    expect(validateRoomJoinPayload(payload)).toBe(false);
  });

  it("should allow clientInfo", () => {
    const payload = {
      nickname: "Test",
      clientInfo: { platform: "web", version: "1.0" },
    };
    expect(validateRoomJoinPayload(payload)).toBe(true);
  });
});

describe("validateAnswerSubmitPayload", () => {
  it("should validate correct payload", () => {
    const payload = {
      questionId: "q1",
      selectedChoiceIds: ["a"],
      submitTime: 1234567890,
    };
    expect(validateAnswerSubmitPayload(payload)).toBe(true);
  });

  it("should reject missing questionId", () => {
    const payload = {
      selectedChoiceIds: ["a"],
      submitTime: 1234567890,
    };
    expect(validateAnswerSubmitPayload(payload)).toBe(false);
  });
});

describe("validatePlayer", () => {
  it("should validate correct player", () => {
    const player = {
      id: "p1",
      nickname: "Test",
      isReady: true,
      isConnected: true,
    };
    expect(validatePlayer(player)).toBe(true);
  });

  it("should reject player without id", () => {
    const player = {
      nickname: "Test",
      isReady: true,
      isConnected: true,
    };
    expect(validatePlayer(player)).toBe(false);
  });
});

describe("validateGameSettings", () => {
  it("should validate correct settings", () => {
    const settings = {
      questionTimeLimit: 20000,
      showLeaderboard: true,
      shuffleQuestions: false,
      shuffleChoices: false,
    };
    expect(validateGameSettings(settings)).toBe(true);
  });

  it("should reject settings with invalid types", () => {
    const settings = {
      questionTimeLimit: "20",
      showLeaderboard: true,
      shuffleQuestions: false,
      shuffleChoices: false,
    };
    expect(validateGameSettings(settings)).toBe(false);
  });
});

describe("validateChoice", () => {
  it("should validate correct choice", () => {
    const choice = { id: "a", text: "Option A" };
    expect(validateChoice(choice)).toBe(true);
  });

  it("should reject choice without id", () => {
    const choice = { text: "Option A" };
    expect(validateChoice(choice)).toBe(false);
  });

  it("should reject choice with empty text", () => {
    const choice = { id: "a", text: "" };
    expect(validateChoice(choice)).toBe(false);
  });
});

describe("validateQuestionShowPayload", () => {
  it("should validate correct payload", () => {
    const payload = {
      questionId: "q1",
      questionIndex: 0,
      totalQuestions: 10,
      prompt: "What is 2+2?",
      choices: [
        { id: "a", text: "3" },
        { id: "b", text: "4" },
        { id: "c", text: "5" },
        { id: "d", text: "6" },
      ],
      startTime: 1234567890,
      durationMs: 20000,
    };
    expect(validateQuestionShowPayload(payload)).toBe(true);
  });

  it("should reject payload with invalid choices", () => {
    const payload = {
      questionId: "q1",
      questionIndex: 0,
      totalQuestions: 10,
      prompt: "What is 2+2?",
      choices: [],
      startTime: 1234567890,
      durationMs: 20000,
    };
    expect(validateQuestionShowPayload(payload)).toBe(false);
  });
});
