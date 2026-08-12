import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logEvent } from '../common/utils/logger.js';

export const requestObservability: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id') ?? randomUUID();
  const startedAt = performance.now();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      logEvent(res.statusCode >= 500 ? 'error' : 'warn', 'http_request_failed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        userId: req.auth?.userId
      });
    }
  });
  next();
};
