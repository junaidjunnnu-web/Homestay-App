import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { logger } from "../lib/logger";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "not_found", message: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large (max 5MB)"
        : err.message;
    res.status(400).json({ error: "validation", message });
    return;
  }

  const log = req.log ?? logger;
  log.error({ err }, "Unhandled request error");

  const status =
    typeof err.status === "number"
      ? err.status
      : typeof err.statusCode === "number"
        ? err.statusCode
        : 500;

  res.status(status).json({
    error: "internal",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
