import type { User } from './types';
import { apiRequest } from '../../lib/api-client';

type AuthResponse = { user: User };

export async function readCurrentUser() {
  try { return (await apiRequest<AuthResponse>('/auth/me')).user; } catch { return null; }
}
export async function authenticate(mode: 'login' | 'register', payload: Record<string, FormDataEntryValue>) {
  const data = await apiRequest<AuthResponse>(`/auth/${mode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
  return data.user;
}
export async function signOut() { await apiRequest('/auth/logout', { method: 'POST' }); }
