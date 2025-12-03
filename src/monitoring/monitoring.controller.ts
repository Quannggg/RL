import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly svc: MonitoringService) {}

  @Get()
  async getOverview() {
    return this.svc.getOverview();
  }
}
