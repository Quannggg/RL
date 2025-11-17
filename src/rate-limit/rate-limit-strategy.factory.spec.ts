import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitStrategyFactory } from './rate-limit-strategy.factory';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { TokenBucketStrategy } from './strategies/token-bucket.strategy';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitStrategyFactory', () => {
  let factory: RateLimitStrategyFactory;
  let slidingWindowStrategy: SlidingWindowStrategy;
  let tokenBucketStrategy: TokenBucketStrategy;

  beforeEach(async () => {
    const mockRateLimitService = {
      allowSlidingWindow: jest.fn(),
      allowTokenBucket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitStrategyFactory,
        SlidingWindowStrategy,
        TokenBucketStrategy,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    factory = module.get<RateLimitStrategyFactory>(RateLimitStrategyFactory);
    slidingWindowStrategy = module.get<SlidingWindowStrategy>(
      SlidingWindowStrategy,
    );
    tokenBucketStrategy =
      module.get<TokenBucketStrategy>(TokenBucketStrategy);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should return SlidingWindowStrategy for "sliding-window"', () => {
    const strategy = factory.create('sliding-window');
    expect(strategy).toBe(slidingWindowStrategy);
    expect(strategy).toBeInstanceOf(SlidingWindowStrategy);
  });

  it('should return TokenBucketStrategy for "token-bucket"', () => {
    const strategy = factory.create('token-bucket');
    expect(strategy).toBe(tokenBucketStrategy);
    expect(strategy).toBeInstanceOf(TokenBucketStrategy);
  });

  it('should throw error for unknown strategy', () => {
    expect(() => {
      factory.create('unknown-strategy' as any);
    }).toThrow('Unknown rate limit strategy: unknown-strategy');
  });

  it('should return the same instance on multiple calls (singleton behavior)', () => {
    const strategy1 = factory.create('sliding-window');
    const strategy2 = factory.create('sliding-window');
    expect(strategy1).toBe(strategy2);
  });
});

