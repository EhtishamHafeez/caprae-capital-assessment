import { NextResponse } from "next/server";

export function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: { message: "Too many requests — please slow down.", retryAfterSeconds } },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
