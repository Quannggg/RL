import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserBlockedPayload } from '../events/user-blocked.event';

@Injectable()
export class RateLimitListener {
  @OnEvent('rate_limit.blocked')
  handleUserBlockedEvent(payload: UserBlockedPayload): void {
    console.log(
      `🚨 SECURITY ALERT: Rate limit exceeded for IP ${payload.ip} on route ${payload.routeKey}`,
    );
  }
}

