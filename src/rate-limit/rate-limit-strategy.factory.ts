import { Injectable } from '@nestjs/common';
import { IRateLimitStrategy } from './strategies/rate-limit-strategy.interface';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { TokenBucketStrategy } from './strategies/token-bucket.strategy';

@Injectable()
export class RateLimitStrategyFactory {
  constructor(
    private readonly slidingWindowStrategy: SlidingWindowStrategy,
    private readonly tokenBucketStrategy: TokenBucketStrategy,
  ) {}

  create(strategyName: 'sliding-window' | 'token-bucket'): IRateLimitStrategy {
    switch (strategyName) {
      case 'sliding-window':
        return this.slidingWindowStrategy;
      case 'token-bucket':
        return this.tokenBucketStrategy;
      default:
        throw new Error(`Unknown rate limit strategy: ${strategyName}`);
    }
  }
}

