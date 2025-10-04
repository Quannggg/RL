import { SetMetadata } from '@nestjs/common';

export type RateLimitOptions =
  | { strategy: 'sliding-window'; limit: number; windowMs: number }
  | {
      strategy: 'token-bucket';
      capacity: number;
      refillTokens: number;
      refillIntervalMs: number;
    };

export const RATE_LIMIT_META = 'rate_limit_meta';
export const RateLimit = (opts: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_META, opts);
