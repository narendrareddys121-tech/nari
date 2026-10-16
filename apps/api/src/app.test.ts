import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('./config/prisma.js', () => ({ prisma: prismaMock }));

type HealthResponse = {
  success: boolean;
  data: {
    status: string;
    services: { database: { status: string } };
  };
};

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost/bidrush_test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);

const testAccessSecret = process.env.JWT_ACCESS_SECRET;

describe('API health check', () => {
  let server: import('node:http').Server;
  let healthUrl: string;
  let apiUrl: string;

  beforeAll(async () => {
    const { createApp } = await import('./app.js');
    server = await new Promise((resolve) => {
      const httpServer = createApp().listen(0, () => resolve(httpServer));
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Health test server did not bind to a TCP port');
    }
    healthUrl = `http://127.0.0.1:${address.port}/api/v1/health`;
    apiUrl = `http://127.0.0.1:${address.port}/api/v1`;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'test-user',
      email: 'test@example.com',
      role: 'USER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
  });

  afterAll(async () => {
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('reports healthy when the database responds', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);

    const response = await fetch(healthUrl);
    const body = await response.json() as HealthResponse;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.services.database.status).toBe('ok');
  });

  it('reports degraded when the database check fails', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Database unavailable'));

    const response = await fetch(healthUrl);
    const body = await response.json() as HealthResponse;

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.data.status).toBe('degraded');
  });

  it('returns paginated notifications for the authenticated user', async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([]);
    prismaMock.notification.count.mockResolvedValue(0);
    const token = jwt.sign(
      { sub: 'test-user', email: 'test@example.com', role: 'USER', status: 'ACTIVE' },
      testAccessSecret,
    );

    const response = await fetch(`${apiUrl}/notifications?page=2&pageSize=10`, {
      headers: { Cookie: `access_token=${token}` },
    });
    const body = await response.json() as {
      data: { pagination: { total: number; page: number; pageSize: number; totalPages: number } };
    };

    expect(response.status).toBe(200);
    expect(body.data.pagination).toEqual({ total: 0, page: 2, pageSize: 10, totalPages: 0 });
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10,
      take: 10,
      where: { userId: 'test-user' },
    }));
  });

  it.each(['0', '-1', 'nope'])('rejects invalid notification page %s', async (page) => {
    const token = jwt.sign(
      { sub: 'test-user', email: 'test@example.com', role: 'USER', status: 'ACTIVE' },
      testAccessSecret,
    );

    const response = await fetch(`${apiUrl}/notifications?page=${page}`, {
      headers: { Cookie: `access_token=${token}` },
    });
    const body = await response.json() as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
  });
});