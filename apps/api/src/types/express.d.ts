import type { JwtPayload } from '../common/utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      requestId?: string;
    }
  }
}

export {};
