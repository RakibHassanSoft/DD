import { google } from 'googleapis';
import { SenderAccountModel } from './sender-account.model.js';
import { authenticatedGoogleClient, toPublicSender } from './google-oauth.service.js';

export async function listSenders(userId: string) {
  const senders = await SenderAccountModel.find({ userId }).sort({ createdAt: -1 });
  return senders.map(toPublicSender);
}
export async function disconnectSender(userId: string, senderId: string) {
  const sender = await SenderAccountModel.findOneAndUpdate({ _id: senderId, userId }, { status: 'disconnected', encryptedAccessToken: '', encryptedRefreshToken: '', lastProviderError: undefined }, { new: true });
  return sender ? toPublicSender(sender) : null;
}
export async function updateSenderControls(userId: string, senderId: string, controls: { enabled: boolean; dailyLimit: number }) {
  const sender = await SenderAccountModel.findOneAndUpdate({ _id: senderId, userId }, { sendingControls: controls }, { new: true });
  return sender ? toPublicSender(sender) : null;
}
export async function sendConnectionTest(userId: string, senderId: string) {
  const sender = await SenderAccountModel.findOne({ _id: senderId, userId }).select('+encryptedAccessToken +encryptedRefreshToken');
  if (!sender) return null;
  if (sender.status !== 'connected') throw new Error('Reconnect this sender account before sending a test.');
  try {
    const auth = await authenticatedGoogleClient(sender);
    const message = [`To: ${sender.email}`, `From: ${sender.email}`, 'Subject: Mailflow connection confirmed', 'Content-Type: text/plain; charset="UTF-8"', '', 'Your Google sender account is connected to Mailflow. This is a self-addressed connection test; no campaign email was sent.'].join('\r\n');
    const raw = Buffer.from(message).toString('base64url');
    const result = await google.gmail({ version: 'v1', auth }).users.messages.send({ userId: 'me', requestBody: { raw } });
    const usageDate = new Date().toISOString().slice(0, 10);
    const todaySent = sender.usage?.usageDate === usageDate ? (sender.usage.todaySent ?? 0) + 1 : 1;
    await SenderAccountModel.findByIdAndUpdate(sender._id, { lastSendingActivityAt: new Date(), lastProviderError: undefined, usage: { usageDate, todaySent } });
    return { messageId: result.data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 400) : 'Google provider error';
    const status = /invalid_grant|unauthenticated|invalid credentials/i.test(message) ? 'reconnect_required' : sender.status;
    await SenderAccountModel.findByIdAndUpdate(sender._id, { lastProviderError: message, status });
    throw error;
  }
}

export async function sendCampaignMessage(userId: string, senderId: string, recipient: string, subject: string, body: string, unsubscribeUrl: string, rfcMessageId: string) {
  const sender = await SenderAccountModel.findOne({ _id: senderId, userId }).select('+encryptedAccessToken +encryptedRefreshToken');
  if (!sender) throw new Error('Sender account not found.');
  if (sender.status !== 'connected') throw new Error('Sender account requires reconnection.');
  const auth = await authenticatedGoogleClient(sender);
  const message = [`To: ${recipient}`, `From: ${sender.email}`, `Subject: ${subject.replace(/[\r\n]/g, ' ')}`, `Message-ID: ${rfcMessageId}`, `List-Unsubscribe: <${unsubscribeUrl}>`, 'Content-Type: text/plain; charset="UTF-8"', '', `${body}\r\n\r\nTo stop receiving these emails, unsubscribe here: ${unsubscribeUrl}`].join('\r\n');
  const result = await google.gmail({ version: 'v1', auth }).users.messages.send({ userId: 'me', requestBody: { raw: Buffer.from(message).toString('base64url') } });
  const usageDate = new Date().toISOString().slice(0, 10); const todaySent = sender.usage?.usageDate === usageDate ? (sender.usage.todaySent ?? 0) + 1 : 1;
  await SenderAccountModel.findByIdAndUpdate(sender._id, { lastSendingActivityAt: new Date(), lastProviderError: undefined, usage: { usageDate, todaySent } });
  return { messageId: result.data.id, threadId: result.data.threadId };
}
