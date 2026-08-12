import { Schema, model } from 'mongoose';

const contactSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  listId: { type: Schema.Types.ObjectId, required: true, ref: 'ContactList', index: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  firstName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },
  company: { type: String, trim: true, default: '' },
  jobTitle: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  customFields: { type: Map, of: String, default: {} },
  status: { type: String, enum: ['ready', 'incomplete'], required: true, default: 'ready' }
}, { timestamps: true, versionKey: false });
contactSchema.index({ userId: 1, email: 1 }, { unique: true });

export const ContactModel = model('Contact', contactSchema);
