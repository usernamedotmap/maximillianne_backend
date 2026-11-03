import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AdminUser } from "@prisma/client";
import { Errors } from "../errors/appError.js";

const extractToken = (req: Request): string | null => {
  const fromCookie = req.cookies?.accessToken as string | undefined;

  if (fromCookie) return fromCookie;

  const authHeaders = req.headers.authorization;
  if (authHeaders && authHeaders.startsWith("Bearer ")) {
    return authHeaders.split(" ")[1];
  }

  return null;
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractToken(req);

  if (!token) {
    throw Errors.noToken();
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = { id: payload.id };
    next();
  } catch (err) {
    throw Errors.invalidToken();
  }
};
