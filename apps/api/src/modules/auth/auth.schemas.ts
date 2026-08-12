import { z } from 'zod';

const password = z.string().min(12, 'Use at least 12 characters.').max(128);
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z.string().trim().email('Enter a valid email address.').transform((value) => value.toLowerCase()),
  password
});
export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Enter your password.')
});
