import type { RequestHandler } from 'express';
import { ContactModel } from './contact.model.js';

export const listContacts: RequestHandler = async (req, res) => {
  const contacts = await ContactModel.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ contacts: contacts.map((contact) => ({ id: String(contact._id), email: contact.email, firstName: contact.firstName, lastName: contact.lastName, company: contact.company, status: contact.status })) });
};
