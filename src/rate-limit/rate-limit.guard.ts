import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  HttpStatus,
  HttpException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request, Response } from 'express';
import { RATE_LIMIT_META, RateLimitOptions } from './rate-limit.decorator';
import { RateLimitStrategyFactory } from './rate-limit-strategy.factory';
import { TooManyRequestsException } from '../common/exceptions/too-many-requests.exception';
import { getRoleFromRequest } from '../utils/get-role';
import roleLimits from '../config/role-limits.json';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly strategyFactory: RateLimitStrategyFactory,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions>(RATE_LIMIT_META, context.getHandler());
    if (!opts) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const role = getRoleFromRequest(req) || 'default';

    // Build full route path: controller prefix + handler path
    const prefix = req.baseUrl || '';
    const handlerPath = req.route?.path ?? req.path ?? req.originalUrl ?? '';
    const fullPath = prefix + handlerPath;
    const routeKey = `${req.method}:${fullPath}`; // e.g. GET:/demo/sliding

    // Find rate limit config for route and role
    const routeCfg = (roleLimits as any).routes?.[routeKey];
    const cfg = (routeCfg && routeCfg[role]) || (roleLimits as any)[role] || (roleLimits as any).default || { limit: 5, perSeconds: 60 };
    const limit = cfg.limit ?? 5;
    const perSeconds = cfg.perSeconds ?? 60;

    // Debug: log request and selected config
    this.logger.debug(`RateLimitGuard: request ${req.method} ${fullPath}, ip=${req.ip}, role=${role}`);
    this.logger.debug(`Selected cfg for routeKey=${routeKey} => ${JSON.stringify(cfg)}`);

    // Merge runtime config into options
    const optsWithRuntime: RateLimitOptions & { runtime?: { limit: number; perSeconds: number; role: string } } = {
      ...opts,
      ...(opts as any),
      runtime: { limit, perSeconds, role },
    };

    // Override limit fields with runtime values
    try {
      (optsWithRuntime as any).limit = limit;
      (optsWithRuntime as any).perSeconds = perSeconds;
    } catch (e) { /* ignore */ }

    // Get strategy from factory and check rate limit
    const strategy = this.strategyFactory.create(opts.strategy);
    const allowed = await strategy.isAllowed(context, optsWithRuntime);

    if (!allowed) {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown';
      const eventRoute = `${req.method}:${fullPath}:${ip}`;

      // Queue request if enabled, otherwise throw 429
      if (opts.enableQueue && this.queueService) {
        try {
          const res = context.switchToHttp().getResponse<Response>();
          const routeKey = `${req.method}:${fullPath}:${ip}`;

          const { jobId, position } = await this.queueService.addRequestToQueue(
            {
              method: req.method,
              path: fullPath,
              body: req.body,
              query: req.query,
              params: req.params,
              headers: req.headers as Record<string, string>,
              ip,
              routeKey,
              rateLimitOptions: opts,
            },
            {
              priority: opts.queuePriority || 0,
            },
          );

          // Return 202 Accepted with queue info
          res.status(HttpStatus.ACCEPTED).json({
            message: 'Request queued for processing',
            jobId,
            position,
            queuedAt: new Date().toISOString(),
          });

          this.logger.log(
            `RateLimit: Request queued ip=${ip} role=${role} route=${fullPath} jobId=${jobId} position=${position}`,
          );

          return false; // Block request execution
        } catch (error) {
          // Fallback to 429 if queue is full
          if (error instanceof Error && error.message.includes('full')) {
            this.eventEmitter.emit('rate_limit.blocked', {
              ip,
              route: eventRoute,
              role,
              timestamp: Date.now(),
            });

            this.logger.warn(
              `RateLimit: blocked (queue full) ip=${ip} role=${role} route=${fullPath}`,
            );

            throw new HttpException(
              {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'Rate limit exceeded and queue is full',
                error: 'Too Many Requests',
              },
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          throw new TooManyRequestsException();
        }
      } else {
        // Emit event and throw 429
        this.eventEmitter.emit('rate_limit.blocked', {
          ip,
          route: eventRoute,
          role,
          timestamp: Date.now(),
        });

        this.logger.warn(
          `RateLimit: blocked ip=${ip} role=${role} route=${fullPath}`,
        );

        throw new TooManyRequestsException();
      }
    }

    return true;
  }
}