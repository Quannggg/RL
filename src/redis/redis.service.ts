import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis; 

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.client = new Redis(url);
    this.logger.log(`Connected to Redis: ${url}`);
    // Optional: handle error events
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    } catch (err) {
      this.logger.error('Error when quitting Redis', err);
    }
  }

  // --- Basic helpers used by listener / monitoring ---
  async incr(key: string) {
    return this.client.incr(key);
  }

  async hIncrBy(key: string, field: string, val = 1) {
    return this.client.hincrby(key, field, val);
  }

  async zIncrBy(key: string, increment: number, member: string) {
    return this.client.zincrby(key, increment, member);
  }

  async hGetAll(key: string) {
    return this.client.hgetall(key);
  }

  async keys(pattern: string) {
    return this.client.keys(pattern);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (typeof ttlSeconds === 'number') {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * zrevrange with scores returns array [member1, score1, member2, score2...]
   * This helper converts to array of { member, score } for convenience.
   */
  async zRevRangeWithScores(key: string, start = 0, stop = 9) {
    const raw = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
    const out: Array<{ member: string; score: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i];
      const score = Number(raw[i + 1] ?? 0);
      out.push({ member, score });
    }
    return out;
  }

  async expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }

  // expose raw client if needed
  getClient() {
    return this.client;
  }
}
