import type {
  Message,
  MessageType,
  RoomJoinPayload,
  AnswerSubmitPayload,
  Player,
  LobbyState,
  GameSettings,
  QuestionShowPayload,
  Choice,
} from "./index.js";

const MESSAGE_TYPES: MessageType[] = [
  "room.join",
  "room.joined",
  "room.leave",
  "lobby.update",
  "game.start",
  "game.end",
  "question.show",
  "question.lock",
  "question.reveal",
  "answer.submit",
  "answer.ack",
  "leaderboard.update",
];

export function isValidMessageType(value: unknown): value is MessageType {
  return (
    typeof value === "string" && MESSAGE_TYPES.includes(value as MessageType)
  );
}

export function validateMessageEnvelope(
  data: unknown,
): data is Message<unknown> {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.v !== "number" || obj.v !== 1) return false;
  if (!isValidMessageType(obj.t)) return false;
  if (typeof obj.id !== "string") return false;
  if (typeof obj.ts !== "number") return false;
  if (typeof obj.payload !== "object") return false;

  return true;
}

export function validateRoomJoinPayload(
  data: unknown,
): data is RoomJoinPayload {
  if (typeof data !== "object" || data === null) return false;

  const payload = data as Record<string, unknown>;

  if (typeof payload.nickname !== "string") return false;
  if (payload.nickname.length < 1 || payload.nickname.length > 20) return false;

  if (payload.clientInfo !== undefined) {
    if (typeof payload.clientInfo !== "object") return false;
  }

  return true;
}

export function validateAnswerSubmitPayload(
  data: unknown,
): data is AnswerSubmitPayload {
  if (typeof data !== "object" || data === null) return false;

  const payload = data as Record<string, unknown>;

  if (typeof payload.questionId !== "string") return false;
  if (!Array.isArray(payload.selectedChoiceIds)) return false;
  if (typeof payload.submitTime !== "number") return false;

  return true;
}

export function validatePlayer(data: unknown): data is Player {
  if (typeof data !== "object" || data === null) return false;

  const player = data as Record<string, unknown>;

  if (typeof player.id !== "string") return false;
  if (typeof player.nickname !== "string") return false;
  if (typeof player.isReady !== "boolean") return false;
  if (typeof player.isConnected !== "boolean") return false;

  return true;
}

export function validateGameSettings(data: unknown): data is GameSettings {
  if (typeof data !== "object" || data === null) return false;

  const settings = data as Record<string, unknown>;

  if (typeof settings.questionTimeLimit !== "number") return false;
  if (typeof settings.showLeaderboard !== "boolean") return false;
  if (typeof settings.shuffleQuestions !== "boolean") return false;
  if (typeof settings.shuffleChoices !== "boolean") return false;

  return true;
}

export function validateChoice(data: unknown): data is Choice {
  if (typeof data !== "object" || data === null) return false;

  const choice = data as Record<string, unknown>;

  if (typeof choice.id !== "string") return false;
  if (typeof choice.text !== "string" || choice.text.length === 0) return false;

  return true;
}

export function validateQuestionShowPayload(
  data: unknown,
): data is QuestionShowPayload {
  if (typeof data !== "object" || data === null) return false;

  const payload = data as Record<string, unknown>;

  if (typeof payload.questionId !== "string") return false;
  if (typeof payload.questionIndex !== "number") return false;
  if (typeof payload.totalQuestions !== "number") return false;
  if (typeof payload.prompt !== "string") return false;
  if (!Array.isArray(payload.choices) || payload.choices.length < 2)
    return false;

  for (const choice of payload.choices) {
    if (!validateChoice(choice)) return false;
  }

  if (typeof payload.startTime !== "number") return false;
  if (typeof payload.durationMs !== "number") return false;

  return true;
}
