export interface PackManifest {
  schemaVersion: string;
  title: string;
  description: string;
  author: string;
  license: string;
  rounds: Round[];
  assets?: AssetManifest;
}

export interface Round {
  id: string;
  name?: string;
  questions: QuestionRef[];
  settings?: RoundSettings;
}

export interface QuestionRef {
  file: string;
}

export interface RoundSettings {
  timeLimit?: number;
  shuffle?: boolean;
}

export interface AssetManifest {
  files: AssetFile[];
}

export interface AssetFile {
  path: string;
  type: 'image' | 'audio';
  mimeType: string;
  size?: number;
}

export type QuestionType = 'mcq' | 'boolean';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: Choice[];
  answer: Answer;
  media?: QuestionMedia;
}

export interface Choice {
  id: string;
  text: string;
}

export interface Answer {
  choiceId: string;
}

export interface QuestionMedia {
  image?: string;
  audio?: string;
}

export interface LoadedPack {
  manifest: PackManifest;
  questions: Question[];
}
