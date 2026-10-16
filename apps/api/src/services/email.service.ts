import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Email service with console fallback for development.
 * Set EMAIL_PROVIDER=smtp and SMTP_* variables for real email.
 */
const createTransport = () => {
  if (env.EMAIL_PROVIDER === 'smtp' && env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return null;
};

const transporter = createTransport();

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (transporter) {
    await transporter.sendMail({
      from: `BidRush <${env.EMAIL_FROM}>`,
      ...options,
    });
    logger.info('Email sent', { to: options.to, subject: options.subject });
  } else {
    // Development console fallback — NOT a security issue as this is dev-only
    logger.info('📧 [DEV EMAIL — no SMTP configured]');
    logger.info(`  To: ${options.to}`);
    logger.info(`  Subject: ${options.subject}`);
    logger.info(`  Body: ${options.text}`);
  }
}

export const emailService = {
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Verify your BidRush account',
      text: `Hi ${name},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.\n\n— BidRush Team`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fff;">
          <h1 style="color: #000; font-size: 28px; margin-bottom: 8px;">BidRush</h1>
          <p style="color: #666; margin-bottom: 32px;">Bid Fast. Win Big.</p>
          <h2 style="color: #000; font-size: 20px;">Verify your email address</h2>
          <p style="color: #333;">Hi ${name},</p>
          <p style="color: #333;">Click the button below to verify your email and activate your BidRush account.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Verify Email Address
          </a>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you didn't create a BidRush account, you can ignore this email.</p>
        </div>
      `,
    });
  },

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Reset your BidRush password',
      text: `Hi ${name},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\n— BidRush Team`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fff;">
          <h1 style="color: #000; font-size: 28px; margin-bottom: 8px;">BidRush</h1>
          <p style="color: #666; margin-bottom: 32px;">Bid Fast. Win Big.</p>
          <h2 style="color: #000; font-size: 20px;">Reset your password</h2>
          <p style="color: #333;">Hi ${name},</p>
          <p style="color: #333;">Click below to reset your BidRush password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password won't change.</p>
        </div>
      `,
    });
  },

  async sendOutbidNotification(email: string, name: string, auctionTitle: string, auctionId: string): Promise<void> {
    const frontendUrl = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const auctionUrl = `${frontendUrl}/auctions/${auctionId}`;

    await sendEmail({
      to: email,
      subject: `You've been outbid on "${auctionTitle}"`,
      text: `Hi ${name},\n\nSomeone outbid you on "${auctionTitle}". Place a new bid: ${auctionUrl}\n\n— BidRush Team`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fff;">
          <h1 style="color: #000; font-size: 28px; margin-bottom: 8px;">BidRush</h1>
          <h2 style="color: #000; font-size: 20px;">You've been outbid!</h2>
          <p style="color: #333;">Hi ${name}, someone placed a higher bid on <strong>${auctionTitle}</strong>.</p>
          <a href="${auctionUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Place New Bid
          </a>
        </div>
      `,
    });
  },
};
