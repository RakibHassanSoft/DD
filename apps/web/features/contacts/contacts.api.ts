import { apiRequest } from '../../lib/api-client';
import type { ContactList, ImportPreview, ImportSummary } from './types';

export async function previewFile(file: File, mapping?: Record<string, string>) {
  const form = new FormData(); form.append('file', file); if (mapping) form.append('mapping', JSON.stringify(mapping));
  return apiRequest<ImportPreview>('/lists/import/preview', { method: 'POST', body: form });
}
export async function importFile(file: File, name: string, mapping: Record<string, string>) {
  const form = new FormData(); form.append('file', file); form.append('name', name); form.append('mapping', JSON.stringify(mapping));
  return apiRequest<{ list: ContactList; summary: ImportSummary }>('/lists/import', { method: 'POST', body: form });
}
export async function getContactLists() {
  return (await apiRequest<{ lists: ContactList[] }>('/lists')).lists;
}
