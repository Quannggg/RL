import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { RATE_LIMIT_META, RateLimitOptions } from './rate-limit.decorator';
import { RateLimitStrategyFactory } from './rate-limit-strategy.factory';
import { TooManyRequestsException } from '../common/exceptions/too-many-requests.exception';
import { getRoleFromRequest } from '../utils/get-role';
import roleLimits from '../config/role-limits.json';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly strategyFactory: RateLimitStrategyFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions>(RATE_LIMIT_META, context.getHandler());
    if (!opts) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const role = getRoleFromRequest(req) || 'default';

    // build "full path" safely: controller prefix + route path if available
    // req.baseUrl is controller prefix, req.route.path is handler path (often '/sliding')
    const prefix = req.baseUrl || '';
    const handlerPath = req.route?.path ?? req.path ?? req.originalUrl ?? '';
    const fullPath = prefix + handlerPath;
    const routeKey = `${req.method}:${fullPath}`; // e.g. GET:/demo/sliding

    // find config
    const routeCfg = (roleLimits as any).routes?.[routeKey];
    const cfg = (routeCfg && routeCfg[role]) || (roleLimits as any)[role] || (roleLimits as any).default || { limit: 5, perSeconds: 60 };
    const limit = cfg.limit ?? 5;
    const perSeconds = cfg.perSeconds ?? 60;

    // DEBUG logs — sẽ in ra terminal để bạn biết đang dùng gì
    this.logger.debug(`RateLimitGuard: request ${req.method} ${fullPath}, ip=${req.ip}, role=${role}`);
    this.logger.debug(`Selected cfg for routeKey=${routeKey} => ${JSON.stringify(cfg)}`);

    // Ensure opts carries runtime info (both for factory and for strategy)
    const optsWithRuntime: RateLimitOptions & { runtime?: { limit: number; perSeconds: number; role: string } } = {
      ...opts,
      // also override any hardcoded limit in opts
      ...(opts as any),
      runtime: { limit, perSeconds, role },
    };

    // Force override commonly-used fields if present
    try {
      // if opts has 'limit' field used by strategies, override it
      (optsWithRuntime as any).limit = limit;
      (optsWithRuntime as any).perSeconds = perSeconds;
    } catch (e) { /* ignore */ }

    // create strategy; prefer factory that accepts runtime (some factories may not, so fallback)
    let strategy;
    strategy = this.strategyFactory.create(opts.strategy);

    // call isAllowed with the optsWithRuntime (so strategy can read runtime override)
    const allowed = await strategy.isAllowed(context, optsWithRuntime);

    if (!allowed) {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown';
      const eventRoute = `${req.method}:${fullPath}:${ip}`;

      this.eventEmitter.emit('rate_limit.blocked', { ip, route: eventRoute, role, timestamp: Date.now() });

      this.logger.warn(`RateLimit: blocked ip=${ip} role=${role} route=${fullPath}`);

      throw new TooManyRequestsException();
    }

    return true;
  }
}