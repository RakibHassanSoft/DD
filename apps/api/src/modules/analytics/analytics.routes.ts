import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { campaign, overview, syncReplies } from './analytics.controller.js';

export const analyticsRouter = Router(); analyticsRouter.use(authenticate); analyticsRouter.get('/overview', asyncHandler(overview)); analyticsRouter.get('/campaigns/:campaignId', asyncHandler(campaign)); analyticsRouter.post('/campaigns/:campaignId/sync-replies', asyncHandler(syncReplies));
