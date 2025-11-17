import { ExecutionContext } from '@nestjs/common';
import { RateLimitOptions } from '../rate-limit.decorator';

export interface IRateLimitStrategy {
  isAllowed(
    context: ExecutionContext,
    options: RateLimitOptions,
  ): Promise<boolean>;
}

