import { randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';

export type JwtPayload = { userId: string; email: string };
type OAuthState = { userId: string; nonce: string; purpose: 'google-oauth' };
type UnsubscribePayload = { userId: string; email: string; campaignId: string; purpose: 'unsubscribe' };

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
}
export function verifyAccessToken(token: string) { return jwt.verify(token, env.JWT_SECRET) as JwtPayload; }
export function createOAuthState(userId: string) {
  return jwt.sign({ userId, nonce: randomBytes(32).toString('hex'), purpose: 'google-oauth' } satisfies OAuthState, env.JWT_SECRET, { expiresIn: '10m' });
}
export function verifyOAuthState(token: string) {
  const value = jwt.verify(token, env.JWT_SECRET) as OAuthState;
  if (value.purpose !== 'google-oauth') throw new Error('Invalid OAuth state.');
  return value;
}
export function createUnsubscribeToken(payload: Omit<UnsubscribePayload, 'purpose'>) { return jwt.sign({ ...payload, purpose: 'unsubscribe' } satisfies UnsubscribePayload, env.JWT_SECRET, { expiresIn: '365d' }); }
export function verifyUnsubscribeToken(token: string) { const value = jwt.verify(token, env.JWT_SECRET) as UnsubscribePayload; if (value.purpose !== 'unsubscribe') throw new Error('Invalid unsubscribe token.'); return value; }
// Render and Netlify use different origins. `none` permits credentialed API calls;
// use `lax` for production custom subdomains that share the same site.
const sameSite = env.COOKIE_SAME_SITE ?? (env.NODE_ENV === 'production' ? 'none' : 'lax');
export const sessionCookie = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };
export const oauthStateCookie = { ...sessionCookie, maxAge: 10 * 60 * 1000 };
