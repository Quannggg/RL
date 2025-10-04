import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private cfg: ConfigService) {
    this.client = new IORedis({
      host: this.cfg.get<string>(
        'REDIS_HOST',
        process.env.REDIS_HOST || 'localhost',
      ),
      port: Number(
        this.cfg.get<string>('REDIS_PORT', process.env.REDIS_PORT || '6379'),
      ),
      // password: this.cfg.get<string>('REDIS_PASSWORD'),
      enableAutoPipelining: true,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
