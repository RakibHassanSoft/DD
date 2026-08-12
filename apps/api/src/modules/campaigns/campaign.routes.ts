import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { check, create, getOne, list, start, transition } from './campaign.controller.js';
export const campaignRouter = Router(); campaignRouter.use(authenticate); campaignRouter.get('/', asyncHandler(list)); campaignRouter.post('/', asyncHandler(create)); campaignRouter.get('/:campaignId', asyncHandler(getOne)); campaignRouter.post('/:campaignId/safety-check', asyncHandler(check)); campaignRouter.post('/:campaignId/start', asyncHandler(start)); campaignRouter.post('/:campaignId/pause', asyncHandler(transition('pause'))); campaignRouter.post('/:campaignId/resume', asyncHandler(transition('resume'))); campaignRouter.post('/:campaignId/stop', asyncHandler(transition('stop')));
