import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    emailVerifiedAt: Date | null;
  };
}

export interface JwtAccessPayload {
  sub: string; // userId
  email: string;
  role: string;
  status: string;
}

/**
 * Extracts and verifies the JWT access token from HTTP-only cookie.
 * Does NOT require authentication (soft auth — sets req.user if valid)
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = req.cookies?.access_token as string | undefined;
    if (!token) {
      return next();
    }
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      status: payload.status,
      emailVerifiedAt: null,
    };
  } catch {
    // Invalid token — treat as unauthenticated
  }
  next();
}

/**
 * Requires a valid authenticated user session.
 * Throws 401 if not authenticated.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  void authenticateRequest(req, next);
}

async function authenticateRequest(
  req: AuthenticatedRequest,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.access_token as string | undefined;
    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'You must be logged in to access this resource');
    }
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_TOKEN', 'Your session is no longer valid');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };

    if (req.user.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }
    if (req.user.status === 'DELETED') {
      throw new AppError(403, 'ACCOUNT_DELETED', 'This account no longer exists');
    }

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please log in again.'));
    }
  }
}

/**
 * Requires the authenticated user to have the ADMIN role.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== 'ADMIN') {
      return next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
    }
    next();
  });
}
