import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  RateLimit,
  RateLimitOptions,
} from '../rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

@Controller('demo')
@UseGuards(RateLimitGuard)
export class DemoController {
  @Get('sliding')
  @RateLimit({ strategy: 'sliding-window', limit: 5, windowMs: 10_000 })
  sliding() {
    return { ok: true, algo: 'sliding-window' };
  }

  @Get('bucket')
  @RateLimit({
    strategy: 'token-bucket',
    capacity: 10,
    refillTokens: 5,
    refillIntervalMs: 10_000,
  } as RateLimitOptions)
  bucket() {
    return { ok: true, algo: 'token-bucket' };
  }
}
