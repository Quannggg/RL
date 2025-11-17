import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisModule } from '../redis/redis.module';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { TokenBucketStrategy } from './strategies/token-bucket.strategy';
import { RateLimitStrategyFactory } from './rate-limit-strategy.factory';
import { RateLimitListener } from './listeners/rate-limit.listener';

@Module({
  imports: [RedisModule, EventEmitterModule.forRoot()],
  providers: [
    RateLimitService,
    RateLimitGuard,
    SlidingWindowStrategy,
    TokenBucketStrategy,
    RateLimitStrategyFactory,
    RateLimitListener,
  ],
  exports: [
    RateLimitService,
    RateLimitGuard,
    SlidingWindowStrategy,
    TokenBucketStrategy,
    RateLimitStrategyFactory,
  ],
})
export class RateLimitModule {}
