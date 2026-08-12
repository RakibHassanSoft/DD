import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { listContacts } from './contact.controller.js';
export const contactRouter = Router(); contactRouter.use(authenticate); contactRouter.get('/', asyncHandler(listContacts));
