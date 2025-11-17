import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { SlidingWindowStrategy } from './sliding-window.strategy';
import { RateLimitService } from '../rate-limit.service';
import { RateLimitOptions } from '../rate-limit.decorator';

describe('SlidingWindowStrategy', () => {
  let strategy: SlidingWindowStrategy;
  let rateLimitService: jest.Mocked<RateLimitService>;

  beforeEach(async () => {
    const mockRateLimitService = {
      allowSlidingWindow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlidingWindowStrategy,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    strategy = module.get<SlidingWindowStrategy>(SlidingWindowStrategy);
    rateLimitService = module.get(RateLimitService);
  });

  const createMockContext = (ip: string = '127.0.0.1'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          method: 'GET',
          baseUrl: '',
          path: '/demo/sliding',
          headers: {},
        }),
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return true when rate limit is not exceeded', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    };

    rateLimitService.allowSlidingWindow.mockResolvedValue({
      allowed: true,
      current: 3,
    });

    const result = await strategy.isAllowed(context, options);

    expect(result).toBe(true);
    expect(rateLimitService.allowSlidingWindow).toHaveBeenCalledWith(
      'GET:/demo/sliding:127.0.0.1',
      5,
      10000,
    );
  });

  it('should return false when rate limit is exceeded', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    };

    rateLimitService.allowSlidingWindow.mockResolvedValue({
      allowed: false,
      current: 6,
    });

    const result = await strategy.isAllowed(context, options);

    expect(result).toBe(false);
  });

  it('should extract IP from x-forwarded-for header', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          method: 'GET',
          baseUrl: '',
          path: '/demo/sliding',
          headers: {
            'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          },
        }),
      }),
    } as ExecutionContext;

    const options: RateLimitOptions = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    };

    rateLimitService.allowSlidingWindow.mockResolvedValue({
      allowed: true,
      current: 1,
    });

    await strategy.isAllowed(context, options);

    expect(rateLimitService.allowSlidingWindow).toHaveBeenCalledWith(
      'GET:/demo/sliding:203.0.113.1',
      5,
      10000,
    );
  });

  it('should throw error when strategy type is invalid', async () => {
    const context = createMockContext();
    const options = {
      strategy: 'token-bucket',
      capacity: 10,
      refillTokens: 5,
      refillIntervalMs: 10000,
    } as RateLimitOptions;

    await expect(strategy.isAllowed(context, options)).rejects.toThrow(
      'Invalid strategy for SlidingWindowStrategy',
    );
  });
});

