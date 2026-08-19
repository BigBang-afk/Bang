import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type SessionPayload = JWTPayload & Record<string, unknown>;

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(getSecretKey(secret));
}

export async function verifySession<T extends SessionPayload = SessionPayload>(
  token: string,
  secret: string,
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    return payload as T;
  } catch {
    return null;
  }
}
