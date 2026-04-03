import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES, ROLES } from '../constants/index.js';
import { JWTPayload, UserRole } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
      user?: any;
    }
  }
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as JWTPayload;

    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === 'inactive') {
      throw new AppError(
        'User account is inactive',
        HTTP_STATUS.FORBIDDEN
      );
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = user;

    next();
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        message: ERROR_MESSAGES.FORBIDDEN,
      });
      return;
    }

    next();
  };
};

export const onlyAdmin = authorize(ROLES.ADMIN as UserRole);
export const onlyAnalystOrAdmin = authorize(
  ROLES.ANALYST as UserRole,
  ROLES.ADMIN as UserRole
);
export const anyRole = authorize(
  ROLES.VIEWER as UserRole,
  ROLES.ANALYST as UserRole,
  ROLES.ADMIN as UserRole
);
