import type { PackManifest, Question, Choice, QuestionType } from './schema';

export class PackValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'PackValidationError';
  }
}

export function validatePackManifest(data: unknown): data is PackManifest {
  if (typeof data !== 'object' || data === null) {
    throw new PackValidationError('Pack manifest must be an object');
  }

  const manifest = data as Record<string, unknown>;

  if (typeof manifest.schemaVersion !== 'string') {
    throw new PackValidationError('schemaVersion must be a string', 'schemaVersion');
  }

  if (typeof manifest.title !== 'string' || manifest.title.length === 0) {
    throw new PackValidationError('title must be a non-empty string', 'title');
  }

  if (typeof manifest.description !== 'string') {
    throw new PackValidationError('description must be a string', 'description');
  }

  if (typeof manifest.author !== 'string') {
    throw new PackValidationError('author must be a string', 'author');
  }

  if (typeof manifest.license !== 'string') {
    throw new PackValidationError('license must be a string', 'license');
  }

  if (!Array.isArray(manifest.rounds) || manifest.rounds.length === 0) {
    throw new PackValidationError('rounds must be a non-empty array', 'rounds');
  }

  for (let i = 0; i < manifest.rounds.length; i++) {
    validateRound(manifest.rounds[i], i);
  }

  return true;
}

function validateRound(round: unknown, index: number): void {
  if (typeof round !== 'object' || round === null) {
    throw new PackValidationError(`round[${index}] must be an object`);
  }

  const r = round as Record<string, unknown>;

  if (typeof r.id !== 'string') {
    throw new PackValidationError(`round[${index}].id must be a string`, `rounds[${index}].id`);
  }

  if (!Array.isArray(r.questions) || r.questions.length === 0) {
    throw new PackValidationError(`round[${index}].questions must be a non-empty array`);
  }

  for (let i = 0; i < r.questions.length; i++) {
    validateQuestionRef(r.questions[i], index, i);
  }
}

function validateQuestionRef(ref: unknown, roundIndex: number, refIndex: number): void {
  if (typeof ref !== 'object' || ref === null) {
    throw new PackValidationError(`round[${roundIndex}].questions[${refIndex}] must be an object`);
  }

  const r = ref as Record<string, unknown>;

  if (typeof r.file !== 'string') {
    throw new PackValidationError(
      `round[${roundIndex}].questions[${refIndex}].file must be a string`,
      `rounds[${roundIndex}].questions[${refIndex}].file`
    );
  }
}

export function validateQuestion(data: unknown): data is Question {
  if (typeof data !== 'object' || data === null) {
    throw new PackValidationError('Question must be an object');
  }

  const q = data as Record<string, unknown>;

  if (typeof q.id !== 'string') {
    throw new PackValidationError('question.id must be a string', 'id');
  }

  if (!['mcq', 'boolean'].includes(q.type as string)) {
    throw new PackValidationError('question.type must be "mcq" or "boolean"', 'type');
  }

  if (typeof q.prompt !== 'string' || q.prompt.length === 0) {
    throw new PackValidationError('question.prompt must be a non-empty string', 'prompt');
  }

  if (!Array.isArray(q.choices) || q.choices.length < 2) {
    throw new PackValidationError('question.choices must have at least 2 choices', 'choices');
  }

  for (let i = 0; i < q.choices.length; i++) {
    validateChoice(q.choices[i], i);
  }

  if (typeof q.answer !== 'object' || q.answer === null) {
    throw new PackValidationError('question.answer must be an object', 'answer');
  }

  const answer = q.answer as Record<string, unknown>;
  if (typeof answer.choiceId !== 'string') {
    throw new PackValidationError('question.answer.choiceId must be a string', 'answer.choiceId');
  }

  const choiceIds = q.choices.map((c: unknown) => (c as Choice).id);
  if (!choiceIds.includes(answer.choiceId)) {
    throw new PackValidationError(
      'question.answer.choiceId must reference a valid choice id',
      'answer.choiceId'
    );
  }

  if (q.media !== undefined) {
    validateMedia(q.media);
  }

  return true;
}

function validateChoice(data: unknown, index: number): data is Choice {
  if (typeof data !== 'object' || data === null) {
    throw new PackValidationError(`choice[${index}] must be an object`);
  }

  const c = data as Record<string, unknown>;

  if (typeof c.id !== 'string') {
    throw new PackValidationError(`choice[${index}].id must be a string`);
  }

  if (typeof c.text !== 'string' || c.text.length === 0) {
    throw new PackValidationError(`choice[${index}].text must be a non-empty string`);
  }

  return true;
}

function validateMedia(data: unknown): void {
  if (typeof data !== 'object' || data === null) {
    throw new PackValidationError('media must be an object');
  }

  const m = data as Record<string, unknown>;

  if (m.image !== undefined && typeof m.image !== 'string') {
    throw new PackValidationError('media.image must be a string');
  }

  if (m.audio !== undefined && typeof m.audio !== 'string') {
    throw new PackValidationError('media.audio must be a string');
  }
}

export function sanitizeText(text: string, maxLength = 500): string {
  return text
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}
