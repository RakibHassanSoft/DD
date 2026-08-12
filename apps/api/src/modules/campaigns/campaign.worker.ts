import type { Job } from 'bullmq';
import { CampaignModel } from './campaign.model.js';
import { EmailJobModel } from './email-job.model.js';
import { ContactModel } from '../contacts/contact.model.js';
import { TemplateModel } from '../templates/template.model.js';
import { renderPersonalization } from '../templates/personalization.service.js';
import { isWithinSendingWindow } from './scheduling.service.js';
import { sendCampaignMessage } from '../senders/sender.service.js';
import { SenderAccountModel } from '../senders/sender-account.model.js';
import { isSuppressed } from '../suppressions/suppression.service.js';
import { recordSuppression } from '../suppressions/suppression.service.js';
import { classifyProviderError } from './provider-risk.service.js';
import { createUnsubscribeToken } from '../../common/utils/jwt.js';
import { env } from '../../config/env.js';

export async function processCampaignEmail(job: Job<{ emailJobId: string }>) {
  const emailJob = await EmailJobModel.findById(job.data.emailJobId); if (!emailJob) return;
  const campaign = await CampaignModel.findById(emailJob.campaignId); if (!campaign) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'cancelled', failureReason: 'Campaign unavailable' }); return; }
  if (campaign.status !== 'RUNNING') { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'cancelled', failureReason: `Campaign ${campaign.status.toLowerCase()}` }); return; }
  const schedule = campaign.schedule!;
  if (!isWithinSendingWindow(schedule)) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'skipped', failureReason: 'Outside allowed sending window' }); return; }
  const [contact, template] = await Promise.all([ContactModel.findOne({ _id: emailJob.contactId, userId: campaign.userId }).lean(), TemplateModel.findOne({ _id: campaign.selectedTemplateId, userId: campaign.userId })]);
  if (!contact || contact.status !== 'ready' || !template) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'skipped', failureReason: 'Contact or template is not eligible' }); return; }
  if (await isSuppressed(String(campaign.userId), contact.email)) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'suppressed', failureReason: 'Recipient is suppressed or unsubscribed' }); return; }
  const sender = await SenderAccountModel.findOne({ _id: campaign.senderId, userId: campaign.userId }); const usageDate = new Date().toISOString().slice(0, 10); const sentBySender = sender?.usage?.usageDate === usageDate ? sender.usage.todaySent ?? 0 : 0;
  if (!sender || sender.status !== 'connected' || !sender.sendingControls?.enabled || sentBySender >= (sender.sendingControls?.dailyLimit ?? 100)) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'skipped', failureReason: 'Sender connection or daily sending control blocks this email' }); return; }
  const sentToday = await EmailJobModel.countDocuments({ campaignId: campaign._id, status: 'sent', sentAt: { $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } });
  if (sentToday >= schedule.dailyLimit) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'skipped', failureReason: 'Campaign daily limit reached' }); return; }
  const values = { ...contact, customFields: contact.customFields ? Object.fromEntries(Object.entries(contact.customFields)) : {} }; const subject = renderPersonalization(template.subject, values); const body = renderPersonalization(template.body, values);
  if (subject.missingVariables.length || body.missingVariables.length) { await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'skipped', failureReason: `Missing personalization fields: ${[...new Set([...subject.missingVariables, ...body.missingVariables])].join(', ')}` }); return; }
  await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'processing', attemptCount: job.attemptsMade + 1 });
  try { const token = createUnsubscribeToken({ userId: String(campaign.userId), email: contact.email, campaignId: String(campaign._id) }); const unsubscribeUrl = `${env.PUBLIC_API_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`; const senderDomain = sender.email.split('@')[1] || 'mailflow.local'; const rfcMessageId = emailJob.rfcMessageId ?? `<mailflow-${String(emailJob._id)}@${senderDomain}>`; const provider = await sendCampaignMessage(String(campaign.userId), String(campaign.senderId), contact.email, subject.rendered, body.rendered, unsubscribeUrl, rfcMessageId); await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: 'sent', providerMessageId: provider.messageId, providerThreadId: provider.threadId, rfcMessageId, sentAt: new Date(), error: undefined }); }
  catch (error) { const message = error instanceof Error ? error.message.slice(0, 400) : 'Provider error'; const risk = classifyProviderError(error); const terminal = job.attemptsMade >= 2 || risk === 'auth' || risk === 'restriction' || risk === 'hard_bounce'; await EmailJobModel.findByIdAndUpdate(emailJob._id, { status: terminal ? 'failed' : 'retrying', error: message, failureReason: terminal ? `${risk}: ${message}` : undefined }); if (risk === 'hard_bounce') await recordSuppression({ userId: String(campaign.userId), campaignId: String(campaign._id), email: contact.email, reason: 'hard_bounce', source: 'provider' }); if (risk === 'restriction') await recordSuppression({ userId: String(campaign.userId), campaignId: String(campaign._id), email: contact.email, reason: 'provider_restriction', source: 'provider' }); if (risk === 'auth') await SenderAccountModel.findByIdAndUpdate(campaign.senderId, { status: 'reconnect_required', lastProviderError: message }); if (terminal) await CampaignModel.findByIdAndUpdate(campaign._id, { status: 'PAUSED', safetyStatus: 'blocked' }); throw error; }
}
