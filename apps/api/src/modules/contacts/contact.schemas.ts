import { z } from 'zod';

export const listIdSchema = z.object({ listId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid contact list.') });
export const importMetadataSchema = z.object({
  name: z.string().trim().min(1, 'Enter a list name.').max(120),
  mapping: z.string().transform((value, context) => {
    try { return z.record(z.string(), z.string()).parse(JSON.parse(value)); }
    catch { context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid column mapping.' }); return z.NEVER; }
  })
});
