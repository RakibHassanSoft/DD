import { Schema, model } from 'mongoose';

const emailJobSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, required: true, ref: 'Campaign', index: true },
  senderId: { type: Schema.Types.ObjectId, required: true, ref: 'SenderAccount' },
  contactId: { type: Schema.Types.ObjectId, required: true, ref: 'Contact', index: true },
  scheduledAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'scheduled', 'processing', 'sent', 'failed', 'retrying', 'skipped', 'suppressed', 'cancelled'], default: 'pending', index: true },
  attemptCount: { type: Number, default: 0 }, providerMessageId: String, providerThreadId: String, rfcMessageId: String, replyProviderMessageId: String, replyFrom: String, replySubject: String, repliedAt: Date, error: String, failureReason: String, sentAt: Date, queueJobId: String
}, { timestamps: true, versionKey: false });
emailJobSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });

export const EmailJobModel = model('EmailJob', emailJobSchema);
