import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitListener } from './rate-limit.listener';
import { UserBlockedPayload } from '../events/user-blocked.event';
import { RedisService } from '../../redis/redis.service';

describe('RateLimitListener', () => {
  let listener: RateLimitListener;

  const mockRedisService = {
    incr: jest.fn(),
    hIncrBy: jest.fn(),
    zIncrBy: jest.fn(),
    expire: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitListener,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    listener = module.get<RateLimitListener>(RateLimitListener);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should update Redis monitoring metrics when user is blocked', async () => {
    const payload = new UserBlockedPayload(
      '203.0.113.1',
      'GET:/demo/sliding',
      'guest',
    );

    await listener.handleBlocked(payload);

    expect(mockRedisService.incr).toHaveBeenCalledWith('monitor:blocks:total');
    expect(mockRedisService.hIncrBy).toHaveBeenCalledWith(
      'monitor:blocks:by_route',
      'GET:/demo/sliding',
      1,
    );
    expect(mockRedisService.zIncrBy).toHaveBeenCalledWith(
      'monitor:blocks:by_ip',
      1,
      '203.0.113.1',
    );
  });

  it('should handle multiple blocked events', async () => {
    const payload1 = new UserBlockedPayload('192.168.1.1', 'GET:/api/users', 'guest');
    const payload2 = new UserBlockedPayload('192.168.1.2', 'POST:/api/posts', 'guest');

    await listener.handleBlocked(payload1);
    await listener.handleBlocked(payload2);

    expect(mockRedisService.incr).toHaveBeenCalledTimes(2);
    expect(mockRedisService.hIncrBy).toHaveBeenCalledTimes(4); // 2 calls per event (by_route + series)
  });
});

