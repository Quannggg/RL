import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { TokenBucketStrategy } from './token-bucket.strategy';
import { RateLimitService } from '../rate-limit.service';
import { RateLimitOptions } from '../rate-limit.decorator';

describe('TokenBucketStrategy', () => {
  let strategy: TokenBucketStrategy;
  let rateLimitService: jest.Mocked<RateLimitService>;

  beforeEach(async () => {
    const mockRateLimitService = {
      allowTokenBucket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBucketStrategy,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    strategy = module.get<TokenBucketStrategy>(TokenBucketStrategy);
    rateLimitService = module.get(RateLimitService);
  });

  const createMockContext = (ip: string = '127.0.0.1'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          method: 'GET',
          baseUrl: '',
          path: '/demo/bucket',
          headers: {},
        }),
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return true when tokens are available', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'token-bucket',
      capacity: 10,
      refillTokens: 5,
      refillIntervalMs: 10000,
    };

    rateLimitService.allowTokenBucket.mockResolvedValue({
      allowed: true,
      tokensLeft: 7,
    });

    const result = await strategy.isAllowed(context, options);

    expect(result).toBe(true);
    expect(rateLimitService.allowTokenBucket).toHaveBeenCalledWith(
      'GET:/demo/bucket:127.0.0.1',
      10,
      5,
      10000,
    );
  });

  it('should return false when no tokens left', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'token-bucket',
      capacity: 10,
      refillTokens: 5,
      refillIntervalMs: 10000,
    };

    rateLimitService.allowTokenBucket.mockResolvedValue({
      allowed: false,
      tokensLeft: 0,
    });

    const result = await strategy.isAllowed(context, options);

    expect(result).toBe(false);
  });

  it('should extract IP from x-forwarded-for header', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          method: 'POST',
          baseUrl: '/api',
          path: '/users',
          headers: {
            'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          },
        }),
      }),
    } as ExecutionContext;

    const options: RateLimitOptions = {
      strategy: 'token-bucket',
      capacity: 10,
      refillTokens: 5,
      refillIntervalMs: 10000,
    };

    rateLimitService.allowTokenBucket.mockResolvedValue({
      allowed: true,
      tokensLeft: 9,
    });

    await strategy.isAllowed(context, options);

    expect(rateLimitService.allowTokenBucket).toHaveBeenCalledWith(
      'POST:/api/users:203.0.113.1',
      10,
      5,
      10000,
    );
  });

  it('should throw error when strategy type is invalid', async () => {
    const context = createMockContext();
    const options = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    } as RateLimitOptions;

    await expect(strategy.isAllowed(context, options)).rejects.toThrow(
      'Invalid strategy for TokenBucketStrategy',
    );
  });
});

