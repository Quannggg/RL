export class UserBlockedPayload {
  ip: string;
  route: string;
  role: string;
  timestamp?: number;

  constructor(ip: string, route: string, role: string, timestamp?: number) {
    this.ip = ip;
    this.route = route;
    this.role = role;
    this.timestamp = timestamp;
  }
}
