import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ConflictError, NotFoundError } from "./leads";
import { AIError } from "./ai/providers/types";
import { fieldErrors, idSchema } from "./validation";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorJson(message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, ...(fields ? { fields } : {}) }, { status });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequest("Request body must be valid JSON");
  }
}

export class BadRequest extends Error {}

export function parseId(raw: string): number {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new NotFoundError("Not found");
  return parsed.data;
}

/** Wraps a route handler with consistent, non-leaky error responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof z.ZodError) return errorJson("Please fix the highlighted fields", 400, fieldErrors(error));
      if (error instanceof BadRequest) return errorJson(error.message, 400);
      if (error instanceof NotFoundError) return errorJson(error.message, 404);
      if (error instanceof ConflictError) return errorJson(error.message, 409);
      if (error instanceof AIError) return errorJson(error.message, error.status);
      console.error("[api] Unexpected error:", error instanceof Error ? error.message : error);
      return errorJson("Something went wrong. Please try again.", 500);
    }
  };
}
