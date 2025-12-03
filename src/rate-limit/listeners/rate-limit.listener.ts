import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitListener {
  private readonly logger = new Logger(RateLimitListener.name);
  constructor(private readonly redis: RedisService) {}

  @OnEvent('rate_limit.blocked', { async: true })
  async handleBlocked(payload: { ip: string; route: string; role: string; timestamp?: number }) {
    const { ip, route, timestamp } = payload;
    try {
      await this.redis.incr('monitor:blocks:total');
      await this.redis.hIncrBy('monitor:blocks:by_route', route, 1);
      await this.redis.zIncrBy('monitor:blocks:by_ip', 1, ip);

      const bucket = this.getTimeBucket(timestamp || Date.now());
      const seriesKey = `monitor:blocks:series:${bucket}`;
      await this.redis.hIncrBy(seriesKey, route, 1);
      await this.redis.expire(seriesKey, 60 * 60 * 24 * 2); // keep 2 days
    } catch (err) {
      this.logger.error('Failed to update monitoring keys', err);
    }
  }

  private getTimeBucket(ts: number) {
    const d = new Date(ts);
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  }
}
