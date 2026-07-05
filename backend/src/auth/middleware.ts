import { NextFunction, Request, Response } from "express";
import { verifyToken, AuthTokenPayload } from "./jwt";
import { HttpError } from "../util/httpError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }
  try {
    req.auth = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== "ADMIN") {
    throw new HttpError(403, "Admin access required");
  }
  next();
}
