import { Router } from 'express';
import { login, logout, me, register } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../common/utils/async-handler.js';

export const authRouter = Router();
authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, asyncHandler(me));
