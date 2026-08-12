import { z } from 'zod';
export const createSuppressionSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), reason: z.enum(['unsubscribe', 'hard_bounce', 'manual_block', 'invalid', 'provider_restriction']), campaignId: z.string().regex(/^[a-f\d]{24}$/i).optional() });
