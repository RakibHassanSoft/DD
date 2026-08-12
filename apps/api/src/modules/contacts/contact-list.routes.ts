import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { getOne, importList, list, preview } from './contact-list.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
export const contactListRouter = Router();
contactListRouter.use(authenticate);
contactListRouter.get('/', asyncHandler(list));
contactListRouter.get('/:listId', asyncHandler(getOne));
contactListRouter.post('/import/preview', upload.single('file'), asyncHandler(preview));
contactListRouter.post('/import', upload.single('file'), asyncHandler(importList));
