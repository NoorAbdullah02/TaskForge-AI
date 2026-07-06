import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  // Format Zod errors if they bypass validation middleware
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Log the error
  if (statusCode === 500) {
    logger.error(`Unhandled Exception at ${req.method} ${req.originalUrl}:`, err);
  } else {
    logger.warn(`API Warning at ${req.method} ${req.originalUrl}: [${statusCode}] ${message}`, errors);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
