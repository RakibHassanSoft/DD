import * as XLSX from 'xlsx';
import { z } from 'zod';
import { ContactModel } from './contact.model.js';

export const contactFields = ['email', 'firstName', 'lastName', 'company', 'jobTitle', 'website'] as const;
export type ContactField = typeof contactFields[number];
type ParsedSheet = { headers: string[]; rows: Record<string, string>[] };
type Mapping = Record<string, string>;

const aliases: Record<ContactField, string[]> = {
  email: ['email', 'email address', 'e-mail'], firstName: ['first name', 'firstname', 'first_name', 'first'], lastName: ['last name', 'lastname', 'last_name', 'last'], company: ['company', 'company name', 'organization'], jobTitle: ['job title', 'title', 'role', 'position'], website: ['website', 'web site', 'url', 'company website']
};
const emailSchema = z.string().trim().email();
const canonical = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

export function parseContactsFile(file: Express.Multer.File): ParsedSheet {
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) throw new Error('Upload a CSV, XLS, or XLSX file.');
  const workbook = XLSX.read(file.buffer, { type: 'buffer', raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The uploaded file does not contain a worksheet.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });
  if (matrix.length < 2) throw new Error('Add a header row and at least one contact row.');
  const headers = (matrix[0] ?? []).map((header) => String(header).trim());
  if (!headers.length || headers.some((header) => !header)) throw new Error('Every import column must have a header.');
  if (new Set(headers.map(canonical)).size !== headers.length) throw new Error('Column headers must be unique.');
  if (matrix.length - 1 > 20000) throw new Error('Imports are limited to 20,000 rows.');
  const rows = matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? '').trim()])));
  return { headers, rows };
}
export function detectMapping(headers: string[]): Mapping {
  const mapping: Mapping = {};
  for (const field of contactFields) {
    const header = headers.find((value) => aliases[field].includes(canonical(value)));
    if (header) mapping[field] = header;
  }
  return mapping;
}
function normalize(parsed: ParsedSheet, mapping: Mapping) {
  const emailHeader = mapping.email;
  if (!emailHeader || !parsed.headers.includes(emailHeader)) throw new Error('Map an Email column before importing.');
  for (const [field, header] of Object.entries(mapping)) if (!contactFields.includes(field as ContactField) || !parsed.headers.includes(header)) throw new Error('The selected column mapping is invalid.');
  const seen = new Set<string>(); let invalid = 0; let duplicate = 0; let incomplete = 0;
  const contacts: Array<{ email: string; firstName: string; lastName: string; company: string; jobTitle: string; website: string; customFields: Record<string, string>; status: 'ready' | 'incomplete' }> = [];
  for (const row of parsed.rows) {
    const email = row[emailHeader]?.trim().toLowerCase() ?? '';
    if (!emailSchema.safeParse(email).success) { invalid++; continue; }
    if (seen.has(email)) { duplicate++; continue; }
    seen.add(email);
    const value = (field: ContactField) => mapping[field] ? row[mapping[field]]?.trim() ?? '' : '';
    const mapped = new Set(Object.values(mapping));
    const customFields = Object.fromEntries(parsed.headers.filter((header) => !mapped.has(header) && row[header]).map((header) => [header, row[header]]));
    const status = value('firstName') ? 'ready' : 'incomplete';
    if (status === 'incomplete') incomplete++;
    contacts.push({ email, firstName: value('firstName'), lastName: value('lastName'), company: value('company'), jobTitle: value('jobTitle'), website: value('website'), customFields, status });
  }
  return { contacts, summary: { rowsRead: parsed.rows.length, valid: contacts.length, invalid, duplicate, incomplete, existing: 0, readyToImport: contacts.length } };
}
export function analyzeContactImport(file: Express.Multer.File, suppliedMapping?: Mapping) {
  const parsed = parseContactsFile(file); const mapping = suppliedMapping ?? detectMapping(parsed.headers); const normalized = mapping.email ? normalize(parsed, mapping) : { contacts: [], summary: { rowsRead: parsed.rows.length, valid: 0, invalid: 0, duplicate: 0, incomplete: 0, existing: 0, readyToImport: 0 } };
  return { parsed, mapping, normalized };
}
export async function previewImport(userId: string, file: Express.Multer.File, suppliedMapping?: Mapping) {
  const { parsed, mapping, normalized } = analyzeContactImport(file, suppliedMapping);
  if (normalized.contacts.length) {
    const existing = await ContactModel.find({ userId, email: { $in: normalized.contacts.map((contact) => contact.email) } }).select('email').lean();
    normalized.summary.existing = existing.length;
    normalized.summary.readyToImport = normalized.contacts.length - existing.length;
  }
  return { headers: parsed.headers, suggestedMapping: mapping, summary: normalized.summary, preview: normalized.contacts.slice(0, 8) };
}
export async function importContacts(userId: string, file: Express.Multer.File, name: string, mapping: Mapping) {
  const normalized = normalize(parseContactsFile(file), mapping);
  const emails = normalized.contacts.map((contact) => contact.email);
  const existing = await ContactModel.find({ userId, email: { $in: emails } }).select('email').lean();
  const existingEmails = new Set(existing.map((contact) => contact.email));
  const contacts = normalized.contacts.filter((contact) => !existingEmails.has(contact.email));
  normalized.summary.existing = existingEmails.size; normalized.summary.readyToImport = contacts.length;
  const { ContactListModel } = await import('./contact-list.model.js');
  const list = await ContactListModel.create({ userId, name, totalContacts: contacts.length });
  if (contacts.length) await ContactModel.insertMany(contacts.map((contact) => ({ ...contact, userId, listId: list._id })), { ordered: true });
  return { list: { id: String(list._id), name: list.name, totalContacts: list.totalContacts, createdAt: list.createdAt }, summary: normalized.summary };
}
