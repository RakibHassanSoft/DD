import { z } from 'zod';

export const campaignContextSchema = z.object({ audience: z.string().trim().min(2).max(300), objective: z.string().trim().min(2).max(500), value: z.string().trim().min(2).max(500), tone: z.string().trim().min(2).max(80), additionalContext: z.string().trim().max(1200).optional().default('') });
export const templateIdSchema = z.object({ templateId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid template.') });
export const updateTemplateSchema = z.object({ subject: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(8000) });
export const customTemplateSchema = z.object({ approach: z.string().trim().min(2).max(80).default('Custom template'), subject: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(8000) });
export const previewTemplateSchema = z.object({ contactId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid contact.') });
export const generatedTemplatesSchema = z.object({ templates: z.array(z.object({ approach: z.string().trim().min(2).max(80), subject: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(8000), variables: z.array(z.string().trim().max(80)).max(20).default([]) })).length(5) });
