import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { create, list, unsubscribe } from './suppression.controller.js';
export const publicSuppressionRouter = Router(); publicSuppressionRouter.get('/unsubscribe', asyncHandler(unsubscribe));
export const suppressionRouter = Router(); suppressionRouter.use(authenticate); suppressionRouter.get('/', asyncHandler(list)); suppressionRouter.post('/', asyncHandler(create));
