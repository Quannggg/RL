import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
