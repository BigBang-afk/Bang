import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminSession, type AdminSessionData } from "@/lib/auth-admin";
import { getCustomerSession, type CustomerSessionData } from "@/lib/auth-customer";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleZodError(error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return jsonError("Validation failed", 422, { fieldErrors });
}

export async function requireAdmin(): Promise<AdminSessionData | NextResponse> {
  const session = await getAdminSession();
  if (!session) return jsonError("Admin authentication required.", 401);
  return session;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function requireCustomer(): Promise<CustomerSessionData | NextResponse> {
  const session = await getCustomerSession();
  if (!session) return jsonError("Please log in to continue.", 401);
  return session;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZJ-${y}${m}${d}-${rand}`;
}

export function generateSku(prefix = "ZJ"): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}
