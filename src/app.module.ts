import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { DemoController } from './demo/demo.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    RateLimitModule,
  ],
  controllers: [DemoController],
})
export class AppModule {}
