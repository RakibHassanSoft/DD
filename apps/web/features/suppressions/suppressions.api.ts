import { apiRequest } from '../../lib/api-client';
export type Suppression = { id: string; email: string; reason: string; source: string; createdAt: string };
const api = apiRequest;
export const getSuppressions = () => api<{ suppressions: Suppression[] }>('/suppressions');
export const addSuppression = (email: string, reason: string) => api<{ suppression: Suppression }>('/suppressions', { method: 'POST', body: JSON.stringify({ email, reason }) });
