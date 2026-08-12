import type { RequestHandler } from 'express';
import { campaignIdSchema, campaignSchema } from './campaign.schemas.js';
import { createCampaign, getCampaign, listCampaigns, safetyCheck, startCampaign, transitionCampaign } from './campaign.service.js';
export const create: RequestHandler = async (req, res) => res.status(201).json({ campaign: await createCampaign(req.auth!.userId, campaignSchema.parse(req.body)) });
export const list: RequestHandler = async (req, res) => res.json({ campaigns: await listCampaigns(req.auth!.userId) });
export const getOne: RequestHandler = async (req, res) => { const { campaignId } = campaignIdSchema.parse(req.params); const campaign = await getCampaign(req.auth!.userId, campaignId); if (!campaign) return res.status(404).json({ message: 'Campaign not found.' }); return res.json({ campaign }); };
export const check: RequestHandler = async (req, res) => { const { campaignId } = campaignIdSchema.parse(req.params); const result = await safetyCheck(req.auth!.userId, campaignId); if (!result) return res.status(404).json({ message: 'Campaign not found.' }); return res.json(result); };
export const start: RequestHandler = async (req, res) => { const { campaignId } = campaignIdSchema.parse(req.params); const result = await startCampaign(req.auth!.userId, campaignId); if (!result) return res.status(404).json({ message: 'Campaign not found.' }); return res.json(result); };
export const transition = (action: 'pause' | 'resume' | 'stop'): RequestHandler => async (req, res) => { const { campaignId } = campaignIdSchema.parse(req.params); const campaign = await transitionCampaign(req.auth!.userId, campaignId, action); if (!campaign) return res.status(404).json({ message: 'Campaign not found.' }); return res.json({ campaign }); };
