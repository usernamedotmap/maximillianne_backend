import { HttpStatus } from "./http-status.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string = "INTERNAL_SERVER_ERROR",
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const Errors = {
  badRequest: (msg = "Bad Request") =>
    new AppError(msg, HttpStatus.BAD_REQUEST, "BAD_REQUEST"),

  unauthorized: (msg = "Authentication Required") =>
    new AppError(msg, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED"),

  invalidCredentials: () =>
    new AppError(
      "Invalid email or password",
      HttpStatus.UNAUTHORIZED,
      "INVALID_CREDENTIALS",
    ),

  tokenExpired: () =>
    new AppError(
      "Session expired. Please refresh.",
      HttpStatus.UNAUTHORIZED,
      "TOKEN_EXPIRED",
    ),

  invalidToken: () =>
    new AppError("Invalid token", HttpStatus.UNAUTHORIZED, "INVALID_TOKEN"),

  tokenReuse: () =>
    new AppError(
      "Token reuse detected, Please log in again.",
      HttpStatus.UNAUTHORIZED,
      "TOKEN_REUSE_DETECTED",
    ),

  noToken: () =>
    new AppError("No token provided", HttpStatus.UNAUTHORIZED, "NO_TOKEN"),

  noRefreshToken: () =>
    new AppError(
      "No refresh token provided",
      HttpStatus.UNAUTHORIZED,
      "NO_REFRESH_TOKEN",
    ),

  forbidden: (msg = "Access denied") =>
    new AppError(msg, HttpStatus.FORBIDDEN, "FORBIDDEN"),

  notFound: (resource = "Resource") =>
    new AppError(`${resource} not found`, HttpStatus.NOT_FOUND, "NOT_FOUND"),

  conflict: (msg = "Conflict") =>
    new AppError(
      msg,
      HttpStatus.CONFLICT,
      "CONFLICT",
    ),

  

  validation: (msg = "Validation failed") =>
    new AppError(msg, HttpStatus.UNPROCESSABLE, "VALIDATION_ERROR"),

  tooMany: (msg = "Too many request, Please slow down.") =>
    new AppError(msg, HttpStatus.TOO_MANY, "TOO_MANY_REQUESTS"),

  internal: (msg = "Something went wrong. Please try again.") =>
    new AppError(
      msg,
      HttpStatus.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    ),
};
