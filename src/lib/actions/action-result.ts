/** Shared Server Action result shape — see any *.actions.ts file for usage. */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
