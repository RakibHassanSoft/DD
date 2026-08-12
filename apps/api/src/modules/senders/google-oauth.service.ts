import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { decryptSecret, encryptSecret } from '../../common/utils/crypto.js';
import { SenderAccountModel } from './sender-account.model.js';

type SenderRecord = { _id: unknown; provider: 'google'; email: string; displayName: string; encryptedAccessToken: string; encryptedRefreshToken: string; expiresAt: Date; status: 'connected' | 'reconnect_required' | 'disconnected'; usage?: { todaySent?: number; usageDate?: string } | null; sendingControls?: { enabled?: boolean; dailyLimit?: number } | null; lastSendingActivityAt?: Date | null; lastProviderError?: string | null; createdAt: Date };
const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.metadata'];
const makeClient = () => new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);

export function createAuthorizationUrl(state: string) {
  return makeClient().generateAuthUrl({ access_type: 'offline', include_granted_scopes: true, prompt: 'consent', scope: scopes, state });
}

export async function connectGoogleAccount(userId: string, code: string) {
  const client = makeClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error('Google did not return an access token.');
  client.setCredentials(tokens);
  const profile = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
  if (!profile.data.id || !profile.data.email) throw new Error('Google did not return an account identity.');
  const existing = await SenderAccountModel.findOne({ userId, provider: 'google', googleAccountId: profile.data.id }).select('+encryptedRefreshToken');
  const refreshToken = tokens.refresh_token ?? (existing ? decryptSecret(existing.encryptedRefreshToken) : undefined);
  if (!refreshToken) throw new Error('Google did not return a refresh token. Disconnect the account in Google and try again.');
  const update = { provider: 'google' as const, googleAccountId: profile.data.id, email: profile.data.email, displayName: profile.data.name ?? profile.data.email, encryptedAccessToken: encryptSecret(tokens.access_token), encryptedRefreshToken: encryptSecret(refreshToken), expiresAt: new Date(tokens.expiry_date ?? Date.now() + 60 * 60 * 1000), status: 'connected' as const, lastProviderError: undefined };
  return SenderAccountModel.findOneAndUpdate({ userId, provider: 'google', googleAccountId: profile.data.id }, update, { new: true, upsert: true, setDefaultsOnInsert: true });
}

export async function authenticatedGoogleClient(sender: SenderRecord) {
  const client = makeClient();
  client.setCredentials({ access_token: decryptSecret(sender.encryptedAccessToken), refresh_token: decryptSecret(sender.encryptedRefreshToken), expiry_date: sender.expiresAt.getTime() });
  client.on('tokens', (tokens) => {
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.encryptedAccessToken = encryptSecret(tokens.access_token);
    if (tokens.refresh_token) update.encryptedRefreshToken = encryptSecret(tokens.refresh_token);
    if (tokens.expiry_date) update.expiresAt = new Date(tokens.expiry_date);
    if (Object.keys(update).length) void SenderAccountModel.findByIdAndUpdate(sender._id, update);
  });
  return client;
}

export const toPublicSender = (sender: SenderRecord) => ({ id: String(sender._id), provider: sender.provider, email: sender.email, displayName: sender.displayName, status: sender.status, usage: sender.usage ?? { todaySent: 0, usageDate: '' }, sendingControls: sender.sendingControls ?? { enabled: true, dailyLimit: 100 }, lastSendingActivityAt: sender.lastSendingActivityAt, lastProviderError: sender.lastProviderError, createdAt: sender.createdAt });
