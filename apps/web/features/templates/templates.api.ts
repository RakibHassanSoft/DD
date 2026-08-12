import { apiRequest } from '../../lib/api-client';
import type { ContactOption, Preview, Template } from './types';

const api = apiRequest;
export const generateTemplates = (context: Record<string, string>) => api<{ templates: Template[] }>('/ai/generate-templates', { method: 'POST', body: JSON.stringify(context) });
export const getTemplates = () => api<{ templates: Template[] }>('/templates');
export const createCustomTemplate = (values: { approach: string; subject: string; body: string }) => api<{ template: Template }>('/templates', { method: 'POST', body: JSON.stringify(values) });
export const saveTemplate = (id: string, values: { subject: string; body: string }) => api<{ template: Template }>(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(values) });
export const selectTemplate = (id: string) => api<{ template: Template }>(`/templates/${id}/select`, { method: 'POST' });
export const getContacts = () => api<{ contacts: ContactOption[] }>('/contacts');
export const previewTemplate = (templateId: string, contactId: string) => api<Preview>(`/templates/${templateId}/preview`, { method: 'POST', body: JSON.stringify({ contactId }) });
