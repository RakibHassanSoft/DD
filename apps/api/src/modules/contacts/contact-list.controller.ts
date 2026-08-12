import type { RequestHandler } from 'express';
import { importMetadataSchema, listIdSchema } from './contact.schemas.js';
import { z } from 'zod';
import { getContactList, listContactLists } from './contact-list.service.js';
import { importContacts, previewImport } from './contact-import.service.js';

const uploadedFile = (req: Express.Request) => { if (!req.file) throw new Error('Choose a CSV, XLS, or XLSX file to import.'); return req.file; };
export const preview: RequestHandler = async (req, res) => {
  const mapping = req.body.mapping ? z.record(z.string(), z.string()).parse(JSON.parse(req.body.mapping)) : undefined;
  return res.json(await previewImport(req.auth!.userId, uploadedFile(req), mapping));
};
export const importList: RequestHandler = async (req, res) => {
  const input = importMetadataSchema.parse(req.body);
  return res.status(201).json(await importContacts(req.auth!.userId, uploadedFile(req), input.name, input.mapping));
};
export const list: RequestHandler = async (req, res) => res.json({ lists: await listContactLists(req.auth!.userId) });
export const getOne: RequestHandler = async (req, res) => {
  const { listId } = listIdSchema.parse(req.params); const list = await getContactList(req.auth!.userId, listId);
  if (!list) return res.status(404).json({ message: 'Contact list not found.' });
  return res.json({ list });
};
