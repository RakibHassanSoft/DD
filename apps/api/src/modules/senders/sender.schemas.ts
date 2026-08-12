import { z } from 'zod';

export const senderIdSchema = z.object({ senderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid sender account.') });
export const senderControlsSchema = z.object({ enabled: z.boolean(), dailyLimit: z.number().int().min(1).max(500) });
