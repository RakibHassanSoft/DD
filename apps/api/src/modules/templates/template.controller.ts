import type { RequestHandler } from 'express';
import { campaignContextSchema, customTemplateSchema, previewTemplateSchema, templateIdSchema, updateTemplateSchema } from './template.schemas.js';
import { createCustomTemplate, createGeneratedTemplates, listTemplates, previewTemplate, selectTemplate, updateTemplate } from './template.service.js';

export const generate: RequestHandler = async (req, res) => res.status(201).json({ templates: await createGeneratedTemplates(req.auth!.userId, campaignContextSchema.parse(req.body)) });
export const create: RequestHandler = async (req, res) => res.status(201).json({ template: await createCustomTemplate(req.auth!.userId, customTemplateSchema.parse(req.body)) });
export const list: RequestHandler = async (req, res) => res.json({ templates: await listTemplates(req.auth!.userId) });
export const update: RequestHandler = async (req, res) => { const { templateId } = templateIdSchema.parse(req.params); const template = await updateTemplate(req.auth!.userId, templateId, updateTemplateSchema.parse(req.body)); if (!template) return res.status(404).json({ message: 'Template not found.' }); return res.json({ template }); };
export const select: RequestHandler = async (req, res) => { const { templateId } = templateIdSchema.parse(req.params); const template = await selectTemplate(req.auth!.userId, templateId); if (!template) return res.status(404).json({ message: 'Template not found.' }); return res.json({ template }); };
export const preview: RequestHandler = async (req, res) => { const { templateId } = templateIdSchema.parse(req.params); const { contactId } = previewTemplateSchema.parse(req.body); const result = await previewTemplate(req.auth!.userId, templateId, contactId); if (!result) return res.status(404).json({ message: 'Template or contact not found.' }); return res.json(result); };
