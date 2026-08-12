import { Schema, model } from 'mongoose';

const contactListSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  totalContacts: { type: Number, required: true, default: 0 }
}, { timestamps: true, versionKey: false });

export const ContactListModel = model('ContactList', contactListSchema);
