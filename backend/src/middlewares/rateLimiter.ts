import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates an in-memory rate limiter for sensitive endpoints (SEC-04).
 * @param windowMs Time window in milliseconds
 * @param maxAttempts Max attempts allowed in windowMs
 * @param message Custom message returned on throttle
 */
export const createRateLimiter = (
  windowMs: number = 60 * 1000,
  maxAttempts: number = 10,
  message: string = 'Too many requests. Please try again later.'
) => {
  const store = new Map<string, RateLimitRecord>();

  // Periodically clean up expired keys every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing if explicitly configured
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.count += 1;
    next();
  };
};

/**
 * Login rate limiter: Max 10 attempts per minute per IP
 */
export const loginRateLimiter = createRateLimiter(
  60 * 1000,
  10,
  'Too many login attempts from this IP. Please try again in 1 minute.'
);

