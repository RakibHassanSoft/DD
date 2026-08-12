import type { RequestHandler } from 'express';
import { findPublicUser, publicUser } from '../users/user.service.js';
import { sessionCookie, signAccessToken } from '../../common/utils/jwt.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { authenticateUser, createUser } from './auth.service.js';

export const register: RequestHandler = async (req, res) => {
  const input = registerSchema.parse(req.body);
  const user = await createUser(input);
  if (!user) return res.status(409).json({ message: 'An account with this email already exists.' });
  res.cookie('session', signAccessToken({ userId: String(user._id), email: user.email }), sessionCookie);
  return res.status(201).json({ user: publicUser(user) });
};
export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await authenticateUser(input.email, input.password);
  if (!user) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.cookie('session', signAccessToken({ userId: String(user._id), email: user.email }), sessionCookie);
  return res.json({ user: publicUser(user) });
};
export const logout: RequestHandler = (_req, res) => { res.clearCookie('session', { path: '/' }); return res.status(204).send(); };
export const me: RequestHandler = async (req, res) => {
  const user = await findPublicUser(req.auth!.userId);
  if (!user) return res.status(401).json({ message: 'Your account is unavailable.' });
  return res.json({ user });
};
