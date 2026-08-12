import { ContactListModel } from '../contacts/contact-list.model.js';
import { ContactModel } from '../contacts/contact.model.js';
import { SenderAccountModel } from '../senders/sender-account.model.js';
import { TemplateModel } from '../templates/template.model.js';
import { SuppressionModel } from '../suppressions/suppression.model.js';
import { EmailJobModel } from './email-job.model.js';
import { CampaignModel } from './campaign.model.js';
import { controlledSchedule } from './scheduling.service.js';
import { emailJobOptions, emailQueue } from '../../common/queue/email.queue.js';

const publicCampaign = (campaign: any) => ({ id: String(campaign._id), name: campaign.name, senderId: String(campaign.senderId), contactListId: String(campaign.contactListId), selectedTemplateId: String(campaign.selectedTemplateId), objective: campaign.objective, audience: campaign.audience, emailContext: campaign.emailContext, schedule: campaign.schedule, status: campaign.status, safetyStatus: campaign.safetyStatus, lastSafetyCheck: campaign.lastSafetyCheck, createdAt: campaign.createdAt, updatedAt: campaign.updatedAt });
export async function createCampaign(userId: string, input: any) { const campaign = await CampaignModel.create({ userId, ...input }); return publicCampaign(campaign); }
export async function listCampaigns(userId: string) { return (await CampaignModel.find({ userId }).sort({ createdAt: -1 })).map(publicCampaign); }
export async function getCampaign(userId: string, campaignId: string) { const campaign = await CampaignModel.findOne({ _id: campaignId, userId }); if (!campaign) return null; const stats = await EmailJobModel.aggregate([{ $match: { campaignId: campaign._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]); return { ...publicCampaign(campaign), stats: Object.fromEntries(stats.map((item) => [item._id, item.count])) }; }
export async function safetyCheck(userId: string, campaignId: string) {
  const campaign = await CampaignModel.findOne({ _id: campaignId, userId }); if (!campaign) return null;
  const [sender, list, template, contactCount, suppressionCount] = await Promise.all([SenderAccountModel.findOne({ _id: campaign.senderId, userId }), ContactListModel.findOne({ _id: campaign.contactListId, userId }), TemplateModel.findOne({ _id: campaign.selectedTemplateId, userId }), ContactModel.countDocuments({ listId: campaign.contactListId, userId, status: 'ready' }), SuppressionModel.countDocuments({ userId })]);
  const schedule = campaign.schedule!; const checks = [{ key: 'sender', label: 'Sender connected', passed: sender?.status === 'connected' }, { key: 'contacts', label: 'Validated contacts available', passed: Boolean(list && contactCount > 0) }, { key: 'template', label: 'Template belongs to workspace', passed: Boolean(template) }, { key: 'suppression', label: 'Suppression protection enabled', passed: true, detail: `${suppressionCount} protected recipient${suppressionCount === 1 ? '' : 's'} on file` }, { key: 'schedule', label: 'Schedule configured', passed: schedule.days.length > 0 && schedule.windowStart < schedule.windowEnd }, { key: 'controls', label: 'Campaign and sender controls enabled', passed: schedule.dailyLimit > 0 && sender?.sendingControls?.enabled === true }];
  const passed = checks.every((check) => check.passed); campaign.safetyStatus = passed ? 'ready' : 'blocked'; campaign.lastSafetyCheck = { checkedAt: new Date(), checks, readyContacts: contactCount, suppressionCount }; if (passed && campaign.status === 'DRAFT') campaign.status = 'READY'; await campaign.save(); return { campaign: publicCampaign(campaign), checks, readyContacts: contactCount, suppressionCount, passed };
}
export async function startCampaign(userId: string, campaignId: string) {
  const readiness = await safetyCheck(userId, campaignId); if (!readiness) return null; if (!readiness.passed) { const error = new Error('Campaign cannot start until all safety checks pass.'); (error as any).status = 422; throw error; }
  const campaign = await CampaignModel.findOne({ _id: campaignId, userId }); if (!campaign) return null; const queue = emailQueue(); if (!queue) { const error = new Error('REDIS_URL is required before starting a campaign.'); (error as any).status = 503; throw error; }
  const schedule = campaign.schedule!; const contacts = await ContactModel.find({ listId: campaign.contactListId, userId, status: 'ready' }).sort({ createdAt: 1 }).limit(schedule.dailyLimit); const times = controlledSchedule(schedule, contacts.length); const jobs = await EmailJobModel.insertMany(contacts.map((contact, index) => ({ campaignId: campaign._id, senderId: campaign.senderId, contactId: contact._id, scheduledAt: times[index], status: 'scheduled' })), { ordered: false }).catch((error) => { if (error?.writeErrors) return error.insertedDocs ?? []; throw error; });
  await Promise.all(jobs.map(async (job: any) => { await queue.add('send', { emailJobId: String(job._id) }, { ...emailJobOptions(job.scheduledAt), jobId: String(job._id) }); await EmailJobModel.findByIdAndUpdate(job._id, { queueJobId: String(job._id) }); }));
  campaign.status = 'RUNNING'; await campaign.save(); return { campaign: publicCampaign(campaign), scheduled: jobs.length };
}
export async function transitionCampaign(userId: string, campaignId: string, action: 'pause' | 'resume' | 'stop') { const states = { pause: 'PAUSED', resume: 'RUNNING', stop: 'STOPPED' } as const; const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, userId }, { status: states[action] }, { new: true }); return campaign ? publicCampaign(campaign) : null; }
