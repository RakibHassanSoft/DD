export type ContactField = 'email' | 'firstName' | 'lastName' | 'company' | 'jobTitle' | 'website';
export type ImportSummary = { rowsRead: number; valid: number; invalid: number; duplicate: number; incomplete: number; existing: number; readyToImport: number };
export type ImportPreview = { headers: string[]; suggestedMapping: Partial<Record<ContactField, string>>; summary: ImportSummary; preview: Array<{ email: string; firstName: string; lastName: string; company: string; jobTitle: string; status: string }> };
export type ContactList = { id: string; name: string; totalContacts: number; createdAt: string };
