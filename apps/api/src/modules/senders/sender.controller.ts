import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { createOAuthState, oauthStateCookie, verifyOAuthState } from '../../common/utils/jwt.js';
import { createAuthorizationUrl, connectGoogleAccount } from './google-oauth.service.js';
import { disconnectSender, listSenders, sendConnectionTest, updateSenderControls } from './sender.service.js';
import { senderControlsSchema, senderIdSchema } from './sender.schemas.js';
import { env } from '../../config/env.js';

export const connect: RequestHandler = (req, res) => {
  const state = createOAuthState(req.auth!.userId);
  res.cookie('google_oauth_state', state, oauthStateCookie);
  return res.redirect(createAuthorizationUrl(state));
};
export const callback: RequestHandler = async (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const expected = req.cookies?.google_oauth_state;
  if (!state || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected))) throw new Error('Invalid OAuth state.');
  const verified = verifyOAuthState(state);
  if (verified.userId !== req.auth!.userId) throw new Error('Invalid OAuth state.');
  res.clearCookie('google_oauth_state', { path: '/' });
  if (req.query.error) return res.redirect(`${env.CLIENT_ORIGIN}/?sender=denied`);
  if (typeof req.query.code !== 'string') throw new Error('Google did not return an authorization code.');
  await connectGoogleAccount(req.auth!.userId, req.query.code);
  return res.redirect(`${env.CLIENT_ORIGIN}/?sender=connected`);
};
export const list: RequestHandler = async (req, res) => res.json({ senders: await listSenders(req.auth!.userId) });
export const disconnect: RequestHandler = async (req, res) => {
  const { senderId } = senderIdSchema.parse(req.params);
  const sender = await disconnectSender(req.auth!.userId, senderId);
  if (!sender) return res.status(404).json({ message: 'Sender account not found.' });
  return res.json({ sender });
};
export const testEmail: RequestHandler = async (req, res) => {
  const { senderId } = senderIdSchema.parse(req.params);
  const result = await sendConnectionTest(req.auth!.userId, senderId);
  if (!result) return res.status(404).json({ message: 'Sender account not found.' });
  return res.json({ message: 'Connection test sent to the connected sender address.', ...result });
};
export const updateControls: RequestHandler = async (req, res) => {
  const { senderId } = senderIdSchema.parse(req.params); const sender = await updateSenderControls(req.auth!.userId, senderId, senderControlsSchema.parse(req.body));
  if (!sender) return res.status(404).json({ message: 'Sender account not found.' });
  return res.json({ sender });
};
