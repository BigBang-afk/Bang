import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthTokenPayload {
  userId: number;
  role: "USER" | "ADMIN";
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}
