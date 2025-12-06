import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        return {
          redis: {
            host,
            port,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'request-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
      settings: {
        maxStalledCount: 1,
      },
      limiter: {
        max: 10, // Process max 10 jobs per interval
        duration: 1000, // Per 1 second
      },
    }),
    forwardRef(() => RateLimitModule),
  ],
  providers: [QueueProcessor, QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

