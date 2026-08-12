import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { callback, connect, disconnect, list, testEmail, updateControls } from './sender.controller.js';

export const googleRouter = Router();
googleRouter.get('/connect', authenticate, connect);
googleRouter.get('/callback', authenticate, asyncHandler(callback));

export const senderRouter = Router();
senderRouter.use(authenticate);
senderRouter.get('/', asyncHandler(list));
senderRouter.post('/:senderId/test-email', asyncHandler(testEmail));
senderRouter.patch('/:senderId/controls', asyncHandler(updateControls));
senderRouter.delete('/:senderId', asyncHandler(disconnect));
