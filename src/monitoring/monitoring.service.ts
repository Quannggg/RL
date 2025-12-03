import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly redis: RedisService) {}

  async getOverview() {
    const total = Number(await this.redis.get('monitor:blocks:total') || 0);
    const byRoute = await this.redis.hGetAll('monitor:blocks:by_route');

    const topRaw = await this.redis.zRevRangeWithScores('monitor:blocks:by_ip', 0, 9);
    const topIps = topRaw.map(({ member, score }) => ({
      ip: member,
      count: score,
    }));

    const keys = await this.redis.keys('monitor:blocks:series:*');
    keys.sort();
    const series: { bucket: string; data: Record<string, string> }[] = [];
    for (const k of keys) {
      const bucket = k.split(':').pop() || '';
      const data = await this.redis.hGetAll(k);
      series.push({ bucket, data });
    }

    return { total, byRoute, topIps, series };
  }
}