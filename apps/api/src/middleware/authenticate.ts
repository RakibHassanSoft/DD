import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../common/utils/jwt.js';

export const authenticate: RequestHandler = (req, res, next) => {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ message: 'Authentication is required.' });

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    res.clearCookie('session');
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};
