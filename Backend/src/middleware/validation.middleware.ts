import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Attach parsed data back to req
      if (parsed && typeof parsed === 'object') {
        if ('body' in parsed) req.body = (parsed as any).body;
        if ('query' in parsed) req.query = (parsed as any).query;
        if ('params' in parsed) req.params = (parsed as any).params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.slice(1).join('.'), // Remove "body", "query", or "params" prefix
          message: issue.message,
        }));
        return next(new ValidationError('Request validation failed', formattedErrors));
      }
      next(error);
    }
  };
};
