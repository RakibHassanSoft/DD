import { ContactListModel } from './contact-list.model.js';
import { ContactModel } from './contact.model.js';

export async function listContactLists(userId: string) {
  const lists = await ContactListModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return lists.map((list) => ({ id: String(list._id), name: list.name, totalContacts: list.totalContacts, createdAt: list.createdAt }));
}
export async function getContactList(userId: string, listId: string) {
  const list = await ContactListModel.findOne({ _id: listId, userId }).lean();
  if (!list) return null;
  const contacts = await ContactModel.find({ listId, userId }).sort({ createdAt: -1 }).limit(100).lean();
  return { id: String(list._id), name: list.name, totalContacts: list.totalContacts, createdAt: list.createdAt, contacts: contacts.map((contact) => ({ id: String(contact._id), email: contact.email, firstName: contact.firstName, lastName: contact.lastName, company: contact.company, jobTitle: contact.jobTitle, website: contact.website, customFields: contact.customFields ? Object.fromEntries(Object.entries(contact.customFields)) : {}, status: contact.status })) };
}
