import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_META, RateLimitOptions } from './rate-limit.decorator';
import { TooManyRequestsException } from '../common/exceptions/too-many-requests.exception';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rl: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_META,
      context.getHandler(),
    );
    if (!opts) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip;
    const route = req.method + ':' + req.baseUrl + req.path;
    const routeKey = `${route}:${ip}`;

    if (opts.strategy === 'sliding-window') {
      const { allowed } = await this.rl.allowSlidingWindow(
        routeKey,
        opts.limit,
        opts.windowMs,
      );
      if (!allowed) throw new TooManyRequestsException();
      return true;
    } else {
      const { allowed } = await this.rl.allowTokenBucket(
        routeKey,
        opts.capacity,
        opts.refillTokens,
        opts.refillIntervalMs,
      );
      if (!allowed) throw new TooManyRequestsException();
      return true;
    }
  }
}
