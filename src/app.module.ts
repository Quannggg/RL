import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { DemoController } from './demo/demo.controller';
import { RateLimitListener } from './rate-limit/listeners/rate-limit.listener';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RedisService } from './redis/redis.service';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';
import { RateLimitStrategyFactory } from './rate-limit/rate-limit-strategy.factory';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    RateLimitModule,
    MonitoringModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [DemoController],
  providers: [RedisService, RateLimitListener, RateLimitGuard, RateLimitStrategyFactory],
  exports: [RedisService],
})
export class AppModule {}
