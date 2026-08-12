import { apiMessage, apiRequest } from '../../lib/api-client';
import type { Sender } from './types';

export async function getSenders() {
  return (await apiRequest<{ senders: Sender[] }>('/senders')).senders;
}
export async function disconnectSender(senderId: string) {
  await apiRequest(`/senders/${senderId}`, { method: 'DELETE' });
}
export async function sendTestEmail(senderId: string) {
  return apiMessage(`/senders/${senderId}/test-email`, { method: 'POST' }, 'Test email sent.');
}
export async function updateSenderControls(senderId: string, controls: { enabled: boolean; dailyLimit: number }) {
  await apiRequest(`/senders/${senderId}/controls`, { method: 'PATCH', body: JSON.stringify(controls) });
}
