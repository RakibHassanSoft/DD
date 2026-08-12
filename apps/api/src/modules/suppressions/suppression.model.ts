import { Schema, model } from 'mongoose';

const suppressionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
  reason: { type: String, enum: ['unsubscribe', 'hard_bounce', 'manual_block', 'invalid', 'provider_restriction'], required: true },
  source: { type: String, enum: ['recipient', 'user', 'provider', 'system'], required: true }
}, { timestamps: true, versionKey: false });
suppressionSchema.index({ userId: 1, email: 1 }, { unique: true });
export const SuppressionModel = model('Suppression', suppressionSchema);
