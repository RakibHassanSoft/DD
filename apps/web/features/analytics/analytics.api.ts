import { apiRequest } from '../../lib/api-client';

const api = apiRequest;
export type Metrics = { total: number; scheduled: number; sent: number; failed: number; suppressed: number; skipped: number; retrying: number; replies: number; unsubscribes: number };
export type AnalyticsOverview = { metrics: Metrics; campaigns: Array<{ id: string; name: string; status: string }>; senders: Array<{ senderId: string; email: string; displayName: string; sent: number; failed: number; replies: number }> };
export type CampaignAnalytics = { campaign: { id: string; name: string; status: string }; metrics: Metrics; activity: Array<{ id: string; type: string; at: string; recipient: string; detail?: string }>; recipients: Array<{ id: string; email: string; name?: string; company?: string; status: string; sentAt?: string; repliedAt?: string; failureReason?: string }> };
export const getAnalyticsOverview = () => api<AnalyticsOverview>('/analytics/overview');
export const getCampaignAnalytics = (campaignId: string) => api<CampaignAnalytics>(`/analytics/campaigns/${campaignId}`);
export const syncCampaignReplies = (campaignId: string) => api<{ matched: number; scanned: number; requiresReconnect: boolean }>(`/analytics/campaigns/${campaignId}/sync-replies`, { method: 'POST' });
