import { NextResponse } from "next/server";

/**
 * Shared API error response handler.
 * Extracts status from custom error objects and returns a consistent JSON error shape.
 *
 * Usage: `return apiError(e);` in catch blocks.
 */
export function apiError(e: unknown): NextResponse {
  const status = (e as { status?: number }).status ?? 500;
  const message = e instanceof Error ? e.message : "An unexpected error occurred";
  return NextResponse.json({ error: message }, { status });
}
