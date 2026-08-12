import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { create, generate, list, preview, select, update } from './template.controller.js';

export const aiRouter = Router(); aiRouter.use(authenticate); aiRouter.post('/generate-templates', asyncHandler(generate));
export const templateRouter = Router(); templateRouter.use(authenticate); templateRouter.get('/', asyncHandler(list)); templateRouter.post('/', asyncHandler(create)); templateRouter.patch('/:templateId', asyncHandler(update)); templateRouter.post('/:templateId/select', asyncHandler(select)); templateRouter.post('/:templateId/preview', asyncHandler(preview));
