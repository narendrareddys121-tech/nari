import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validate request body against a Zod schema.
 * Throws 400 with structured errors if validation fails.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }
    // @ts-ignore — replace query with parsed values
    req.query = result.data as Record<string, string>;
    next();
  };
}
