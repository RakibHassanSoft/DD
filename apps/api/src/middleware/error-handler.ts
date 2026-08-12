import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logEvent } from '../common/utils/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({ message: 'Please correct the highlighted fields.', errors: err.flatten().fieldErrors });
  }
  if (typeof err === 'object' && err && 'code' in err && err.code === 11000) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  if (err instanceof Error && err.message === 'Invalid OAuth state.') {
    return res.status(400).json({ message: 'The Google connection session is invalid or has expired. Please try again.' });
  }
  if (err instanceof Error && err.message === 'Invalid unsubscribe token.') {
    return res.status(400).json({ message: 'This unsubscribe link is invalid or has expired.' });
  }
  if (typeof err === 'object' && err && 'status' in err && typeof err.status === 'number') {
    return res.status(err.status).json({ message: err instanceof Error ? err.message : 'Request failed.' });
  }
  logEvent('error', 'unhandled_api_error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.auth?.userId,
    errorName: err instanceof Error ? err.name : 'UnknownError',
    errorMessage: err instanceof Error ? err.message.slice(0, 300) : 'Unknown error'
  });
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
