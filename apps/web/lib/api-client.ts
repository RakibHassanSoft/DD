/**
 * The browser's only transport boundary to the independently deployed API.
 * Feature modules should use these helpers instead of knowing where the API runs.
 */
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type ApiError = { message?: string };

async function readBody<T>(response: Response): Promise<T & ApiError> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return {} as T & ApiError;
  return response.json() as Promise<T & ApiError>;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'include' });
  const data = await readBody<T>(response);
  if (!response.ok) throw new Error(data.message ?? 'The API request failed.');
  return data;
}

export async function apiMessage(path: string, init: RequestInit = {}, fallback = 'The API request failed.') {
  const data = await apiRequest<{ message?: string }>(path, init);
  return data.message ?? fallback;
}
