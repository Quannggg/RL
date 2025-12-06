import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { RateLimitOptions } from '../rate-limit/rate-limit.decorator';

export interface QueuedRequest {
  method: string;
  path: string;
  body?: any;
  query?: any;
  params?: any;
  headers?: Record<string, string>;
  ip: string;
  routeKey: string;
  rateLimitOptions: RateLimitOptions;
}

// Maximum queue size to prevent memory overflow
const MAX_QUEUE_SIZE = 1000;

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('request-queue') private readonly requestQueue: Queue,
  ) {}

  async addRequestToQueue(
    request: QueuedRequest,
    options?: { priority?: number; delay?: number },
  ): Promise<{ jobId: string; position?: number }> {
    try {
      // Check queue size before adding
      const waiting = await this.requestQueue.getWaitingCount();
      const active = await this.requestQueue.getActiveCount();

      if (waiting + active >= MAX_QUEUE_SIZE) {
        throw new Error('Queue is full. Please try again later.');
      }

      const job = await this.requestQueue.add('process-request', request, {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
      });

      // Get updated queue length for position info
      const updatedWaiting = await this.requestQueue.getWaitingCount();
      const updatedActive = await this.requestQueue.getActiveCount();

      return {
        jobId: job.id!,
        position: updatedWaiting + updatedActive,
      };
    } catch (error) {
      // If queue is full, throw error
      if (error instanceof Error && error.message.includes('full')) {
        throw new Error('Queue is full. Please try again later.');
      }
      throw error;
    }
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.requestQueue.getWaitingCount(),
      this.requestQueue.getActiveCount(),
      this.requestQueue.getCompletedCount(),
      this.requestQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
      maxSize: MAX_QUEUE_SIZE,
    };
  }
}

