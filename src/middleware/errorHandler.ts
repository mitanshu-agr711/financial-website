import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/validation.js';
import { HTTP_STATUS } from '../constants/index.js';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors,
      statusCode: err.statusCode,
    });
    return;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Validation error',
      errors: err.message,
    });
    return;
  }

  // Mongoose duplicate key errors
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    res.status(HTTP_STATUS.CONFLICT).json({
      message: `${field} already exists`,
      field,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: 'Token expired',
    });
    return;
  }

  // Default error response
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    message: 'Route not found',
  });
};
