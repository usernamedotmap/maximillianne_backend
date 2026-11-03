import { Request, Response, ErrorRequestHandler, NextFunction } from "express";
import { HttpStatus } from "./http-status.js";
import { ZodError } from "zod";
import { AppError } from "./appError.js";

// ----------- JWT ERROR ------------- //
const isJwtError = (err: unknown): err is Error & { name: string } => {
  return (
    err instanceof Error &&
    ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
      err.name,
    )
  );
};

const isJsonParseError = (err: unknown): boolean => {
  return (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as any).status === HttpStatus.BAD_REQUEST &&
    "body" in err
  );
};

// ---------- ZOD ERROR ---------- //
const formZodError = (res: Response, err: ZodError): void => {
  const errors = err.issues.map((errs) => ({
    field: errs.path.join("."),
    message: errs.message,
  }));

  res.status(HttpStatus.UNPROCESSABLE).json({
    code: "VALIDATION_ERROR",
    message: "Validation Error",
    details: errors,
  });
};

// ----------- LOG ERROR ---------- //
const logError = (err: unknown, req: Request): void => {
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    if (!err.isOperational) logError(err, req);
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (isJsonParseError(err)) {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON in request body",
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    formZodError(res, err);
    return;
  }

  if (isJwtError(err)) {
    let code = "INVALID_TOKEN";
    let message = "Invalid token";

    if (err.name === "TokenExpiredError") {
      ((code = "TOKEN_EXPIRED"), (message = "Token has expired"));
    } else if (err.name === "NotBeforeError") {
      ((code = "TOKEN_NOT_ACTIVE"), (message = "Token is not active yet"));
    }

    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error: {
        code,
        message,
      },
    });
    return;
  }

  logError(err, req);

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occured",
    },
  });
  return;
};
