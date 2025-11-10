import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  RateLimit,
  RateLimitOptions,
} from '../rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

@Controller('demo')
@UseGuards(RateLimitGuard)
export class DemoController {
  @Get()
  @RateLimit({ strategy: 'sliding-window', limit: 5, windowMs: 10_000 })
  getDemoEndpoint() {
    return { ok: true, message: 'This is the main /demo endpoint' };
  }
  @Get('sliding')
  @RateLimit({ strategy: 'sliding-window', limit: 5, windowMs: 10_000 }) //5 requests per 10s [now-10s, now]
  sliding() {
    return { ok: true, algo: 'sliding-window' };
  }

  @Get('bucket')
  @RateLimit({
    strategy: 'token-bucket',
    capacity: 10,
    refillTokens: 5,
    refillIntervalMs: 10_000,
  } as RateLimitOptions) //bucket of 10, refilling 5 tokens
  bucket() {
    return { ok: true, algo: 'token-bucket' };
  }
}
