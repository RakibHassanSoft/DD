import { apiRequest } from '../../lib/api-client';
import type { Campaign } from './types';

const api = apiRequest;
export const getCampaigns = () => api<{ campaigns: Campaign[] }>('/campaigns');
export const createCampaign = (payload: Record<string, unknown>) => api<{ campaign: Campaign }>('/campaigns', { method: 'POST', body: JSON.stringify(payload) });
export const checkCampaign = (id: string) => api<{ campaign: Campaign; checks: Array<{ label: string; passed: boolean }>; passed: boolean }>(`/campaigns/${id}/safety-check`, { method: 'POST' });
export const startCampaign = (id: string) => api<{ campaign: Campaign; scheduled: number }>(`/campaigns/${id}/start`, { method: 'POST' });
export const transitionCampaign = (id: string, action: 'pause' | 'resume' | 'stop') => api<{ campaign: Campaign }>(`/campaigns/${id}/${action}`, { method: 'POST' });
