import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestObservability } from './middleware/request-observability.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { googleRouter, senderRouter } from './modules/senders/sender.routes.js';
import { contactListRouter } from './modules/contacts/contact-list.routes.js';
import { contactRouter } from './modules/contacts/contact.routes.js';
import { aiRouter, templateRouter } from './modules/templates/template.routes.js';
import { campaignRouter } from './modules/campaigns/campaign.routes.js';
import { publicSuppressionRouter, suppressionRouter } from './modules/suppressions/suppression.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(requestObservability);
app.get('/api/health/live', (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }));
app.get('/api/health/ready', async (_req, res) => {
  const database = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !database) return res.status(503).set('Cache-Control', 'no-store').json({ status: 'unavailable', database: 'disconnected' });
  try { await database.admin().ping(); return res.set('Cache-Control', 'no-store').json({ status: 'ok', database: 'connected' }); }
  catch { return res.status(503).set('Cache-Control', 'no-store').json({ status: 'unavailable', database: 'unreachable' }); }
});
app.get('/api/health', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).set('Cache-Control', 'no-store').json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false }), authRouter);
app.use('/api/google', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false }), googleRouter);
app.use('/api/senders', senderRouter);
app.use('/api/lists', contactListRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/ai', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false }), aiRouter);
app.use('/api/templates', templateRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api', publicSuppressionRouter);
app.use('/api/suppressions', suppressionRouter);
app.use('/api/analytics', analyticsRouter);
app.use(errorHandler);
