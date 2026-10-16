import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailService } from './email.service.js';
import type { JwtAccessPayload } from '../middleware/auth.js';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64MB
  timeCost: 3,
  parallelism: 4,
};

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  },

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  },

  generateAccessToken(user: { id: string; email: string; role: string; status: string }): string {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  },

  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  },

  async createSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return prisma.session.create({
      data: { userId, refreshToken, expiresAt, userAgent, ipAddress },
    });
  },

  setAuthCookies(
    res: import('express').Response,
    accessToken: string,
    refreshToken: string
  ): void {
    const isProd = env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth/refresh',
    });
  },

  clearAuthCookies(res: import('express').Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  },

  async register(data: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }

    const passwordHash = await this.hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
        },
      });

      await tx.userProfile.create({
        data: { userId: newUser.id, city: 'Bengaluru' },
      });

      await tx.sellerVerification.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });

    // Send verification email
    await this.sendVerificationEmail(user.id, user.email, user.name);

    return user;
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      // Use same error to prevent user enumeration
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isValid = await this.verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Contact support.');
    }

    return user;
  },

  async loginWithGoogle(code: string, redirectUri: string) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AppError(503, 'GOOGLE_AUTH_NOT_CONFIGURED', 'Google sign-in is not configured yet.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google sign-in could not be verified.');
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google did not return an access token.');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) {
      throw new AppError(401, 'GOOGLE_PROFILE_FAILED', 'Google profile information could not be loaded.');
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      throw new AppError(401, 'GOOGLE_PROFILE_INVALID', 'A verified Google email is required.');
    }
    const email = profile.email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email }] },
    });

    if (existing) {
      if (existing.status === 'SUSPENDED') {
        throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Contact support.');
      }
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: profile.sub,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          name: profile.name || existing.name,
          profile: {
            upsert: {
              create: { avatarUrl: profile.picture },
              update: { avatarUrl: profile.picture ?? undefined },
            },
          },
        },
        include: { profile: true },
      });
    }

    const passwordHash = await this.hashPassword(crypto.randomBytes(32).toString('hex'));
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: profile.name || email.split('@')[0],
          email,
          googleId: profile.sub,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.userProfile.create({ data: { userId: user.id, avatarUrl: profile.picture, city: 'Bengaluru' } });
      await tx.sellerVerification.create({ data: { userId: user.id } });
      return user;
    });
  },

  async sendVerificationEmail(userId: string, email: string, name: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate old tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });

    await emailService.sendVerificationEmail(email, name, token);
  },

  async verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt) {
      throw new AppError(400, 'INVALID_TOKEN', 'This verification link is invalid or already used');
    }

    if (record.expiresAt < new Date()) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'This verification link has expired. Please request a new one.');
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  },

  async sendPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Don't reveal whether email exists
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await emailService.sendPasswordResetEmail(email, user.name, token);
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt) {
      throw new AppError(400, 'INVALID_TOKEN', 'This reset link is invalid or already used');
    }

    if (record.expiresAt < new Date()) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'This reset link has expired. Please request a new one.');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Invalidate all sessions
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);
  },

  async refresh(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session expired. Please log in again.');
    }

    if (session.user.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }

    const newRefreshToken = this.generateRefreshToken();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt: newExpiry },
    });

    const accessToken = this.generateAccessToken(session.user);
    return { accessToken, refreshToken: newRefreshToken, user: session.user };
  },
};
