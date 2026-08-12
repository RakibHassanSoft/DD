import { z } from 'zod';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm time format.');
export const campaignIdSchema = z.object({ campaignId: id });
export const campaignSchema = z.object({ name: z.string().trim().min(2).max(120), senderId: id, contactListId: id, selectedTemplateId: id, objective: z.string().trim().min(2).max(500), audience: z.string().trim().min(2).max(300), emailContext: z.string().trim().max(1200).optional().default(''), schedule: z.object({ startAt: z.coerce.date(), timezone: z.string().trim().min(2).max(80), days: z.array(z.number().int().min(0).max(6)).min(1).max(7), windowStart: time, windowEnd: time, dailyLimit: z.number().int().min(1).max(500) }).refine((schedule) => schedule.windowStart < schedule.windowEnd, { message: 'Window end must be after window start.', path: ['windowEnd'] }) });
