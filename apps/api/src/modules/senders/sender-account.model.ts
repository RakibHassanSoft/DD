import { Schema, model } from 'mongoose';

const senderAccountSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  provider: { type: String, enum: ['google'], required: true },
  googleAccountId: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  encryptedAccessToken: { type: String, required: true, select: false },
  encryptedRefreshToken: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['connected', 'reconnect_required', 'disconnected'], default: 'connected' },
  usage: { todaySent: { type: Number, default: 0 }, usageDate: { type: String, default: '' } },
  sendingControls: { enabled: { type: Boolean, default: true }, dailyLimit: { type: Number, default: 100, min: 1, max: 500 } },
  lastSendingActivityAt: Date,
  lastProviderError: String
}, { timestamps: true, versionKey: false });
senderAccountSchema.index({ userId: 1, provider: 1, googleAccountId: 1 }, { unique: true });

export const SenderAccountModel = model('SenderAccount', senderAccountSchema);
