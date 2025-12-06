import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QueuedRequest } from './queue.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { RateLimitOptions } from '../rate-limit/rate-limit.decorator';

@Processor('request-queue')
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  @Process('process-request')
  async process(job: Job<QueuedRequest>): Promise<any> {
    const {
      routeKey,
      method,
      path,
      body,
      query,
      params,
      headers,
      ip,
      rateLimitOptions,
    } = job.data;

    this.logger.log(
      `Processing queued request: ${method} ${path} (Job ID: ${job.id}, Route: ${routeKey})`,
    );

    try {
      // Re-check rate limit before processing using the original options
      let allowed: { allowed: boolean; current?: number; tokensLeft?: number };
      
      if (rateLimitOptions.strategy === 'sliding-window') {
        allowed = await this.rateLimitService.allowSlidingWindow(
          routeKey,
          rateLimitOptions.limit,
          rateLimitOptions.windowMs,
        );
      } else {
        allowed = await this.rateLimitService.allowTokenBucket(
          routeKey,
          rateLimitOptions.capacity,
          rateLimitOptions.refillTokens,
          rateLimitOptions.refillIntervalMs,
        );
      }

      if (!allowed.allowed) {
        // Still rate limited, re-queue with delay
        this.logger.warn(
          `Request still rate limited, re-queuing: ${method} ${path} (Job ID: ${job.id})`,
        );
        throw new Error('Still rate limited');
      }

      // Simulate processing the request
      // In a real scenario, you would call the actual handler here
      this.logger.log(
        `Successfully processed queued request: ${method} ${path} (Job ID: ${job.id})`,
      );

      return {
        success: true,
        method,
        path,
        processedAt: new Date().toISOString(),
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(
        `Error processing queued request: ${method} ${path} (Job ID: ${job.id})`,
        error,
      );
      throw error;
    }
  }
}

