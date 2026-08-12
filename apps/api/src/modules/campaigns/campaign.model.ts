import { Schema, model } from 'mongoose';

const campaignSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  senderId: { type: Schema.Types.ObjectId, required: true, ref: 'SenderAccount' },
  contactListId: { type: Schema.Types.ObjectId, required: true, ref: 'ContactList' },
  selectedTemplateId: { type: Schema.Types.ObjectId, required: true, ref: 'Template' },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  objective: { type: String, required: true, trim: true, maxlength: 500 },
  audience: { type: String, required: true, trim: true, maxlength: 300 },
  emailContext: { type: String, trim: true, maxlength: 1200, default: '' },
  schedule: { startAt: { type: Date, required: true }, timezone: { type: String, required: true }, days: [{ type: Number, min: 0, max: 6 }], windowStart: { type: String, required: true }, windowEnd: { type: String, required: true }, dailyLimit: { type: Number, required: true, min: 1, max: 500 } },
  status: { type: String, enum: ['DRAFT', 'READY', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED'], default: 'DRAFT', index: true },
  safetyStatus: { type: String, enum: ['pending', 'ready', 'blocked'], default: 'pending' },
  lastSafetyCheck: { type: Schema.Types.Mixed }
}, { timestamps: true, versionKey: false });

export const CampaignModel = model('Campaign', campaignSchema);
