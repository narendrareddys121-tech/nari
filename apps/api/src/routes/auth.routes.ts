import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  registerRequestSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@bidrush/shared';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

export const authRouter = Router();

// The browser starts OAuth through the Next.js same-origin proxy. Keeping the
// fallback on WEB_ORIGIN makes the flow work after deployment without pointing
// Google at a private API hostname. Set GOOGLE_REDIRECT_URI when the API has a
// separate public callback URL.
const googleRedirectUri = () =>
  env.GOOGLE_REDIRECT_URI ?? `${env.WEB_ORIGIN}/api/v1/auth/google/callback`;

// Starts Google's account chooser. Google will show all available accounts because
// prompt=select_account is explicit, even when a browser already has a session.
authRouter.get('/google/start', (req, res, next) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.redirect(`${env.WEB_ORIGIN}/auth/login?error=google_not_configured`);
      return;
    }
    const redirectUri = googleRedirectUri();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/google/callback', async (req, res, next) => {
  try {
    if (typeof req.query.error === 'string') {
      res.redirect(`${env.WEB_ORIGIN}/auth/login?error=google_cancelled`);
      return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) throw new AppError(400, 'GOOGLE_CODE_REQUIRED', 'Google authorization was cancelled or failed.');
    const redirectUri = googleRedirectUri();
    const user = await authService.loginWithGoogle(code, redirectUri);
    const refreshToken = authService.generateRefreshToken();
    const accessToken = authService.generateAccessToken(user);
    await authService.createSession(user.id, refreshToken, req.headers['user-agent'], req.ip);
    authService.setAuthCookies(res, accessToken, refreshToken);
    res.redirect(`${env.WEB_ORIGIN}/auctions?auth=google-success`);
  } catch (err) {
    const errorCode = err instanceof AppError && err.code === 'GOOGLE_AUTH_FAILED'
      ? 'google_failed'
      : 'google_error';
    res.redirect(`${env.WEB_ORIGIN}/auth/login?error=${errorCode}`);
  }
});

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many attempts. Try again in 15 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many attempts. Try again in 1 hour.' },
  },
});

// POST /api/v1/auth/register
authRouter.post('/register', authLimiter, validateBody(registerRequestSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    const refreshToken = authService.generateRefreshToken();
    const accessToken = authService.generateAccessToken(user);

    await authService.createSession(
      user.id,
      refreshToken,
      req.headers['user-agent'],
      req.ip
    );

    authService.setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
          sellerStatus: 'UNVERIFIED',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
authRouter.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const user = await authService.login(req.body.email, req.body.password);
    const refreshToken = authService.generateRefreshToken();
    const accessToken = authService.generateAccessToken(user);

    await authService.createSession(
      user.id,
      refreshToken,
      req.headers['user-agent'],
      req.ip
    );

    authService.setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } });
    }
    authService.clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      throw new AppError(401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
    }

    const result = await authService.refresh(refreshToken);
    const newAccessToken = authService.generateAccessToken(result.user);

    authService.setAuthCookies(res, newAccessToken, result.refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        profile: true,
        sellerVerification: true,
      },
    });

    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
          sellerStatus: user.sellerVerification?.status ?? 'UNVERIFIED',
          createdAt: user.createdAt,
          profile: user.profile
            ? {
                displayName: user.profile.displayName,
                avatarUrl: user.profile.avatarUrl,
                bio: user.profile.bio,
                city: user.profile.city,
                locality: user.profile.locality,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/forgot-password
authRouter.post(
  '/forgot-password',
  strictLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      await authService.sendPasswordReset(req.body.email);
      // Always return success to prevent user enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/reset-password
authRouter.post(
  '/reset-password',
  strictLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.json({ success: true, message: 'Password reset successfully. Please log in.' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/auth/verify-email
authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) throw new AppError(400, 'TOKEN_REQUIRED', 'Verification token is required');
    await authService.verifyEmail(token);
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    next(err);
  }
});
