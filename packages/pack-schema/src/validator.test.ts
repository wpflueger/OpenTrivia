import { describe, it, expect } from 'vitest';
import {
  validatePackManifest,
  validateQuestion,
  PackValidationError,
} from '../src/validator';

describe('validatePackManifest', () => {
  it('should validate a correct manifest', () => {
    const manifest = {
      schemaVersion: '1.0',
      title: 'Test Pack',
      description: 'A test trivia pack',
      author: 'Test Author',
      license: 'MIT',
      rounds: [
        {
          id: 'round1',
          questions: [{ file: 'questions/q1.json' }],
        },
      ],
    };
    expect(validatePackManifest(manifest)).toBe(true);
  });

  it('should reject manifest without schemaVersion', () => {
    const manifest = {
      title: 'Test Pack',
      description: 'A test trivia pack',
      author: 'Test Author',
      license: 'MIT',
      rounds: [],
    };
    expect(() => validatePackManifest(manifest)).toThrow(PackValidationError);
  });

  it('should reject empty title', () => {
    const manifest = {
      schemaVersion: '1.0',
      title: '',
      description: 'A test trivia pack',
      author: 'Test Author',
      license: 'MIT',
      rounds: [],
    };
    expect(() => validatePackManifest(manifest)).toThrow(PackValidationError);
  });

  it('should reject empty rounds', () => {
    const manifest = {
      schemaVersion: '1.0',
      title: 'Test Pack',
      description: 'A test trivia pack',
      author: 'Test Author',
      license: 'MIT',
      rounds: [],
    };
    expect(() => validatePackManifest(manifest)).toThrow(PackValidationError);
  });
});

describe('validateQuestion', () => {
  it('should validate a correct MCQ question', () => {
    const question = {
      id: 'q1',
      type: 'mcq',
      prompt: 'What is the capital of France?',
      choices: [
        { id: 'a', text: 'London' },
        { id: 'b', text: 'Paris' },
        { id: 'c', text: 'Berlin' },
        { id: 'd', text: 'Madrid' },
      ],
      answer: { choiceId: 'b' },
    };
    expect(validateQuestion(question)).toBe(true);
  });

  it('should validate a correct boolean question', () => {
    const question = {
      id: 'q1',
      type: 'boolean',
      prompt: 'The sky is blue.',
      choices: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ],
      answer: { choiceId: 'true' },
    };
    expect(validateQuestion(question)).toBe(true);
  });

  it('should reject question with invalid type', () => {
    const question = {
      id: 'q1',
      type: 'invalid',
      prompt: 'What is 2+2?',
      choices: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
      ],
      answer: { choiceId: 'b' },
    };
    expect(() => validateQuestion(question)).toThrow(PackValidationError);
  });

  it('should reject question with empty prompt', () => {
    const question = {
      id: 'q1',
      type: 'mcq',
      prompt: '',
      choices: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
      ],
      answer: { choiceId: 'b' },
    };
    expect(() => validateQuestion(question)).toThrow(PackValidationError);
  });

  it('should reject question with less than 2 choices', () => {
    const question = {
      id: 'q1',
      type: 'mcq',
      prompt: 'What is 2+2?',
      choices: [{ id: 'a', text: '4' }],
      answer: { choiceId: 'a' },
    };
    expect(() => validateQuestion(question)).toThrow(PackValidationError);
  });

  it('should reject question with invalid answer choiceId', () => {
    const question = {
      id: 'q1',
      type: 'mcq',
      prompt: 'What is 2+2?',
      choices: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
      ],
      answer: { choiceId: 'c' },
    };
    expect(() => validateQuestion(question)).toThrow(PackValidationError);
  });
});
