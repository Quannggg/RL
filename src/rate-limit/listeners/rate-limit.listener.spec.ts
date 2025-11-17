import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitListener } from './rate-limit.listener';
import { UserBlockedPayload } from '../events/user-blocked.event';

describe('RateLimitListener', () => {
  let listener: RateLimitListener;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitListener],
    }).compile();

    listener = module.get<RateLimitListener>(RateLimitListener);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should log security alert when user is blocked', () => {
    const payload = new UserBlockedPayload(
      '203.0.113.1',
      'GET:/demo/sliding:203.0.113.1',
    );

    listener.handleUserBlockedEvent(payload);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('🚨 SECURITY ALERT'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('203.0.113.1'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET:/demo/sliding:203.0.113.1'),
    );
  });

  it('should handle multiple blocked events', () => {
    const payload1 = new UserBlockedPayload('192.168.1.1', 'GET:/api/users:192.168.1.1');
    const payload2 = new UserBlockedPayload('192.168.1.2', 'POST:/api/posts:192.168.1.2');

    listener.handleUserBlockedEvent(payload1);
    listener.handleUserBlockedEvent(payload2);

    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });
});

