import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  expiresAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function isRateLimited(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${scope}:${ip}`;
  const current = buckets.get(key);

  if (!current || current.expiresAt <= now) {
    buckets.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count += 1;
  return false;
}
