// Keep browser requests same-origin so HTTP-only cookies work in every deployment.
const BASE_URL = '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  let url: string;
  if (path.startsWith('http')) {
    url = path;
  } else if (path.startsWith('/api/v1')) {
    url = path;
  } else {
    url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ success: false }));

  if (!res.ok || data.success === false) {
    throw new ApiError(
      res.status,
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.message ?? 'An error occurred',
      data.error?.details
    );
  }

  return data.data ?? data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  upload: async <T>(path: string, body: FormData): Promise<T> => {
    const url = path.startsWith('/api/v1')
      ? path
      : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ success: false }));
    if (!res.ok || data.success === false) {
      throw new ApiError(
        res.status,
        data.error?.code ?? 'UNKNOWN_ERROR',
        data.error?.message ?? 'An error occurred',
        data.error?.details
      );
    }
    return data.data ?? data;
  },
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
};

export { ApiError };
