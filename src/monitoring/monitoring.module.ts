import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, RedisService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
