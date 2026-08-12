import type { RequestHandler } from 'express';
import { campaignIdSchema } from '../campaigns/campaign.schemas.js';
import { campaignAnalytics, syncCampaignReplies, workspaceOverview } from './analytics.service.js';

export const overview: RequestHandler = async (req, res) => res.json(await workspaceOverview(req.auth!.userId));
export const campaign: RequestHandler = async (req, res) => { const { campaignId } = campaignIdSchema.parse(req.params); const data = await campaignAnalytics(req.auth!.userId, campaignId); if (!data) return res.status(404).json({ message: 'Campaign not found.' }); return res.json(data); };
export const syncReplies: RequestHandler = async (req, res) => { const { campaignId } = campaignIdSchema.parse(req.params); const result = await syncCampaignReplies(req.auth!.userId, campaignId); if (!result) return res.status(404).json({ message: 'Campaign not found.' }); return res.json(result); };
