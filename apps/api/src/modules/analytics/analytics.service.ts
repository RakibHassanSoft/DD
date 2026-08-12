import { google } from 'googleapis';
import { EmailJobModel } from '../campaigns/email-job.model.js';
import { CampaignModel } from '../campaigns/campaign.model.js';
import { SenderAccountModel } from '../senders/sender-account.model.js';
import { authenticatedGoogleClient } from '../senders/google-oauth.service.js';
import { SuppressionModel } from '../suppressions/suppression.model.js';

const emptyMetrics = () => ({ total: 0, scheduled: 0, sent: 0, failed: 0, suppressed: 0, skipped: 0, retrying: 0, replies: 0, unsubscribes: 0 });
const metricsFromRows = (rows: Array<{ _id: string; count: number; replies?: number }>, unsubscribes = 0) => { const metrics = emptyMetrics(); for (const row of rows) { metrics.total += row.count; if (row._id in metrics) (metrics as Record<string, number>)[row._id] = row.count; metrics.replies += row.replies ?? 0; } metrics.unsubscribes = unsubscribes; return metrics; };
const displayStatus: Record<string, string> = { scheduled: 'Email scheduled', processing: 'Email processing', sent: 'Email sent', failed: 'Email failed', retrying: 'Retry scheduled', skipped: 'Email skipped', suppressed: 'Recipient suppressed', cancelled: 'Email cancelled' };

export async function campaignAnalytics(userId: string, campaignId: string) {
  const campaign = await CampaignModel.findOne({ _id: campaignId, userId }).lean(); if (!campaign) return null;
  const [rows, unsubscribes, jobs] = await Promise.all([
    EmailJobModel.aggregate([{ $match: { campaignId: campaign._id } }, { $group: { _id: '$status', count: { $sum: 1 }, replies: { $sum: { $cond: [{ $ifNull: ['$repliedAt', false] }, 1, 0] } } } }]),
    SuppressionModel.countDocuments({ userId, campaignId: campaign._id, reason: 'unsubscribe' }),
    EmailJobModel.find({ campaignId: campaign._id }).populate('contactId', 'email firstName lastName company').sort({ updatedAt: -1 }).limit(100).lean()
  ]);
  const activity = jobs.map((job) => ({ id: String(job._id), type: displayStatus[job.status] ?? 'Email updated', at: job.updatedAt, recipient: (job.contactId as unknown as { email?: string })?.email ?? 'Unknown recipient', detail: job.error ?? job.failureReason ?? undefined }));
  const recipients = jobs.map((job) => { const contact = job.contactId as unknown as { email?: string; firstName?: string; lastName?: string; company?: string }; return { id: String(job._id), email: contact?.email ?? 'Unknown recipient', name: [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || undefined, company: contact?.company, status: job.status, sentAt: job.sentAt, repliedAt: job.repliedAt, failureReason: job.failureReason }; });
  return { campaign: { id: String(campaign._id), name: campaign.name, status: campaign.status }, metrics: metricsFromRows(rows, unsubscribes), activity, recipients };
}

export async function workspaceOverview(userId: string) {
  const campaigns = await CampaignModel.find({ userId }).select('_id senderId name status').lean(); const ids = campaigns.map((campaign) => campaign._id);
  const [rows, unsubscribes, senderRows] = await Promise.all([
    EmailJobModel.aggregate([{ $match: { campaignId: { $in: ids } } }, { $group: { _id: '$status', count: { $sum: 1 }, replies: { $sum: { $cond: [{ $ifNull: ['$repliedAt', false] }, 1, 0] } } } }]),
    SuppressionModel.countDocuments({ userId, reason: 'unsubscribe' }),
    EmailJobModel.aggregate([{ $match: { campaignId: { $in: ids } } }, { $group: { _id: '$senderId', sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, replies: { $sum: { $cond: [{ $ifNull: ['$repliedAt', false] }, 1, 0] } } } }])
  ]);
  const senderNames = await SenderAccountModel.find({ userId }).select('email displayName').lean(); const senderMap = new Map(senderNames.map((sender) => [String(sender._id), sender]));
  return { metrics: metricsFromRows(rows, unsubscribes), campaigns: campaigns.map((campaign) => ({ id: String(campaign._id), name: campaign.name, status: campaign.status })), senders: senderRows.map((row) => ({ senderId: String(row._id), email: senderMap.get(String(row._id))?.email ?? 'Unknown sender', displayName: senderMap.get(String(row._id))?.displayName ?? 'Unknown sender', sent: row.sent, failed: row.failed, replies: row.replies })) };
}

const header = (headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string) => headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
export async function syncCampaignReplies(userId: string, campaignId: string) {
  const campaign = await CampaignModel.findOne({ _id: campaignId, userId }); if (!campaign) return null;
  const sender = await SenderAccountModel.findOne({ _id: campaign.senderId, userId }).select('+encryptedAccessToken +encryptedRefreshToken'); if (!sender) throw new Error('Campaign sender is unavailable.');
  const sentJobs = await EmailJobModel.find({ campaignId: campaign._id, status: 'sent', $or: [{ providerThreadId: { $exists: true } }, { rfcMessageId: { $exists: true } }] }); if (!sentJobs.length) return { matched: 0, scanned: 0, requiresReconnect: false };
  try {
    const auth = await authenticatedGoogleClient(sender); const gmail = google.gmail({ version: 'v1', auth }); const listed = await gmail.users.messages.list({ userId: 'me', maxResults: 100 }); const threadMap = new Map(sentJobs.filter((job) => job.providerThreadId).map((job) => [job.providerThreadId!, job])); const rfcMap = new Map(sentJobs.filter((job) => job.rfcMessageId).map((job) => [job.rfcMessageId!, job])); let matched = 0;
    for (const item of listed.data.messages ?? []) { const metadata = await gmail.users.messages.get({ userId: 'me', id: item.id!, format: 'metadata', metadataHeaders: ['From', 'Subject', 'In-Reply-To', 'References'] }); const headers = metadata.data.payload?.headers; const from = header(headers, 'From'); if (!from || from.toLowerCase().includes(sender.email.toLowerCase())) continue; const references = `${header(headers, 'In-Reply-To')} ${header(headers, 'References')}`; const job = (item.threadId ? threadMap.get(item.threadId) : undefined) ?? [...rfcMap.entries()].find(([messageId]) => references.includes(messageId))?.[1]; if (!job || job.repliedAt) continue; await EmailJobModel.findByIdAndUpdate(job._id, { repliedAt: new Date(Number(metadata.data.internalDate ?? Date.now())), replyFrom: from.slice(0, 300), replySubject: header(headers, 'Subject').slice(0, 500), replyProviderMessageId: item.id }); matched++; }
    return { matched, scanned: (listed.data.messages ?? []).length, requiresReconnect: false };
  } catch (error) { const message = error instanceof Error ? error.message.slice(0, 400) : 'Unable to sync reply metadata.'; await SenderAccountModel.findByIdAndUpdate(sender._id, { lastProviderError: message }); const wrapped = new Error('Reply sync requires reconnecting the sender to grant Gmail metadata access.'); (wrapped as Error & { status: number }).status = 409; throw wrapped; }
}
