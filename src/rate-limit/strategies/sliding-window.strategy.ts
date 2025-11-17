import { Injectable, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IRateLimitStrategy } from './rate-limit-strategy.interface';
import { RateLimitOptions } from '../rate-limit.decorator';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class SlidingWindowStrategy implements IRateLimitStrategy {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async isAllowed(
    context: ExecutionContext,
    options: RateLimitOptions,
  ): Promise<boolean> {
    if (options.strategy !== 'sliding-window') {
      throw new Error('Invalid strategy for SlidingWindowStrategy');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip;
    const route = req.method + ':' + req.baseUrl + req.path;
    const routeKey = `${route}:${ip}`;

    const { allowed } = await this.rateLimitService.allowSlidingWindow(
      routeKey,
      options.limit,
      options.windowMs,
    );

    return allowed;
  }
}

