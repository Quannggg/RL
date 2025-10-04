import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { readFileSync } from 'fs';
import { join } from 'path';

export type Strategy = 'sliding-window' | 'token-bucket';

@Injectable()
export class RateLimitService {
  private slidingSha!: string;
  private bucketSha!: string;

  constructor(private readonly redis: RedisService) {}

  async onModuleInit() {
    // Load & script load to get SHA for EVALSHA
    const client = this.redis.getClient();

    const sliding = readFileSync(
      join(__dirname, 'strategies', 'sliding-window.lua'),
      'utf8',
    );
    const bucket = readFileSync(
      join(__dirname, 'strategies', 'token-bucket.lua'),
      'utf8',
    );

    this.slidingSha = (await client.script('LOAD', sliding)) as string;
    this.bucketSha = (await client.script('LOAD', bucket)) as string;
  }

  private key(routeKey: string) {
    return `rl:${routeKey}`;
  }

  async allowSlidingWindow(
    routeKey: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; current: number }> {
    const now = Date.now();
    const [allowed, current] = (await this.redis
      .getClient()
      .evalsha(
        this.slidingSha,
        1,
        this.key(routeKey),
        now,
        windowMs,
        limit,
      )) as [number, number];

    return { allowed: allowed === 1, current };
  }

  async allowTokenBucket(
    routeKey: string,
    capacity: number,
    refillTokens: number,
    refillIntervalMs: number,
  ): Promise<{ allowed: boolean; tokensLeft: number }> {
    const now = Date.now();
    const [allowed, left] = (await this.redis
      .getClient()
      .evalsha(
        this.bucketSha,
        1,
        this.key(routeKey),
        now,
        capacity,
        refillTokens,
        refillIntervalMs,
      )) as [number, number];

    return { allowed: allowed === 1, tokensLeft: left };
  }
}
