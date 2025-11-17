import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { RATE_LIMIT_META, RateLimitOptions } from './rate-limit.decorator';
import { RateLimitStrategyFactory } from './rate-limit-strategy.factory';
import { UserBlockedPayload } from './events/user-blocked.event';
import { TooManyRequestsException } from '../common/exceptions/too-many-requests.exception';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly strategyFactory: RateLimitStrategyFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_META,
      context.getHandler(),
    );
    if (!opts) return true;

    const strategy = this.strategyFactory.create(opts.strategy);
    const allowed = await strategy.isAllowed(context, opts);

    if (!allowed) {
      const req = context.switchToHttp().getRequest<Request>();
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown';
      const route = req.method + ':' + req.baseUrl + req.path;
      const routeKey = `${route}:${ip}`;

      this.eventEmitter.emit(
        'rate_limit.blocked',
        new UserBlockedPayload(ip, routeKey),
      );

      throw new TooManyRequestsException();
    }

    return true;
  }
}
