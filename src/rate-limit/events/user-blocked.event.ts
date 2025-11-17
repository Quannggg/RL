export class UserBlockedPayload {
  ip: string;
  routeKey: string;

  constructor(ip: string, routeKey: string) {
    this.ip = ip;
    this.routeKey = routeKey;
  }
}

