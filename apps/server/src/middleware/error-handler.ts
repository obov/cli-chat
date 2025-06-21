import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  console.error(`[Error] ${req.method} ${req.path}:`, err);

  res.status(status).json({
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};