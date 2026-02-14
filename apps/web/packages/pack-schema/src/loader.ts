import type { PackManifest, Question, LoadedPack } from "./schema";
import { validatePackManifest, validateQuestion } from "./validator";

export class PackLoadError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "PackLoadError";
  }
}

export interface PackLoaderOptions {
  baseUrl: string;
  timeout?: number;
}

export class PackLoader {
  private baseUrl: string;
  private timeout: number;

  constructor(options: PackLoaderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeout = options.timeout ?? 30000;
  }

  async load(): Promise<LoadedPack> {
    const manifest = await this.fetchJson<PackManifest>("/pack.json");
    validatePackManifest(manifest);

    const questions: Question[] = [];

    for (const round of manifest.rounds) {
      for (const questionRef of round.questions) {
        const question = await this.fetchJson<Question>(`/${questionRef.file}`);
        validateQuestion(question);
        questions.push(question);
      }
    }

    return { manifest, questions };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new PackLoadError(
          `Failed to fetch ${path}: ${response.statusText}`,
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new PackLoadError(`Request timeout for ${path}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function parseGitUrl(url: string): {
  owner: string;
  repo: string;
  path?: string;
  ref?: string;
} {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    /github\.com\/([^\/]+)\/([^\/]+?)\/tree\/([^\/]+)\/(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
      };
    }
  }

  throw new PackLoadError("Invalid GitHub URL format");
}

export function getRawContentUrl(
  owner: string,
  repo: string,
  ref = "main",
  path = "",
): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
}

export function getApiUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}`;
}
