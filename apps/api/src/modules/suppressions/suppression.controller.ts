import type { RequestHandler } from 'express';
import { verifyUnsubscribeToken } from '../../common/utils/jwt.js';
import { createSuppressionSchema } from './suppression.schemas.js';
import { listSuppressions, recordSuppression } from './suppression.service.js';
export const list: RequestHandler = async (req, res) => res.json({ suppressions: await listSuppressions(req.auth!.userId) });
export const create: RequestHandler = async (req, res) => { const input = createSuppressionSchema.parse(req.body); return res.status(201).json({ suppression: await recordSuppression({ ...input, userId: req.auth!.userId, source: 'user' }) }); };
export const unsubscribe: RequestHandler = async (req, res) => { const token = typeof req.query.token === 'string' ? req.query.token : ''; const payload = verifyUnsubscribeToken(token); await recordSuppression({ userId: payload.userId, email: payload.email, campaignId: payload.campaignId, reason: 'unsubscribe', source: 'recipient' }); return res.type('html').send('<!doctype html><html><body style="font-family:Arial;padding:3rem;color:#172420"><h1>You are unsubscribed.</h1><p>You will not receive further campaign emails from this workspace.</p></body></html>'); };
