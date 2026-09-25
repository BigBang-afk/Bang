// Small fetch helper for client components.
export type ApiResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export async function api<T = Record<string, unknown>>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Request failed (${res.status})`, fields: data.fields };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}
