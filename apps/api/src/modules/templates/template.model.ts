import { Schema, model } from 'mongoose';

const templateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  groupId: { type: String, required: true, index: true },
  approach: { type: String, required: true, maxlength: 80 },
  subject: { type: String, required: true, maxlength: 180 },
  body: { type: String, required: true, maxlength: 8000 },
  variables: [{ type: String }],
  context: { audience: String, objective: String, value: String, tone: String, additionalContext: String },
  selected: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });
templateSchema.index({ userId: 1, groupId: 1 });

export const TemplateModel = model('Template', templateSchema);
