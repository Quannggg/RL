import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitStrategyFactory } from './rate-limit-strategy.factory';
import { IRateLimitStrategy } from './strategies/rate-limit-strategy.interface';
import { TooManyRequestsException } from '../common/exceptions/too-many-requests.exception';
import { UserBlockedPayload } from './events/user-blocked.event';
import { RateLimitOptions } from './rate-limit.decorator';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let strategyFactory: jest.Mocked<RateLimitStrategyFactory>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockStrategy: jest.Mocked<IRateLimitStrategy>;

  beforeEach(async () => {
    mockStrategy = {
      isAllowed: jest.fn(),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const mockStrategyFactory = {
      create: jest.fn().mockReturnValue(mockStrategy),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RateLimitStrategyFactory,
          useValue: mockStrategyFactory,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get(Reflector);
    strategyFactory = module.get(RateLimitStrategyFactory);
    eventEmitter = module.get(EventEmitter2);
  });

  const createMockContext = (
    ip: string = '127.0.0.1',
    headers: any = {},
  ): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          method: 'GET',
          baseUrl: '',
          path: '/demo/sliding',
          headers,
        }),
      }),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when no rate limit options are set', async () => {
    const context = createMockContext();
    reflector.get.mockReturnValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(strategyFactory.create).not.toHaveBeenCalled();
  });

  it('should return true when rate limit is not exceeded', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    };

    reflector.get.mockReturnValue(options);
    mockStrategy.isAllowed.mockResolvedValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(strategyFactory.create).toHaveBeenCalledWith('sliding-window');
    expect(mockStrategy.isAllowed).toHaveBeenCalledWith(context, options);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should throw TooManyRequestsException and emit event when rate limit exceeded', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    };

    reflector.get.mockReturnValue(options);
    mockStrategy.isAllowed.mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(
      TooManyRequestsException,
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'rate_limit.blocked',
      expect.objectContaining({
        ip: '127.0.0.1',
        routeKey: 'GET:/demo/sliding:127.0.0.1',
      }),
    );
  });

  it('should extract IP from x-forwarded-for header when available', async () => {
    const context = createMockContext('127.0.0.1', {
      'x-forwarded-for': '203.0.113.1, 198.51.100.1',
    });
    const options: RateLimitOptions = {
      strategy: 'token-bucket',
      capacity: 10,
      refillTokens: 5,
      refillIntervalMs: 10000,
    };

    reflector.get.mockReturnValue(options);
    mockStrategy.isAllowed.mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(
      TooManyRequestsException,
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'rate_limit.blocked',
      expect.objectContaining({
        ip: '203.0.113.1',
        routeKey: 'GET:/demo/sliding:203.0.113.1',
      }),
    );
  });

  it('should use "unknown" as IP when no IP is available', async () => {
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          ip: undefined,
          method: 'GET',
          baseUrl: '',
          path: '/demo/sliding',
          headers: {},
        }),
      }),
    } as any;

    const options: RateLimitOptions = {
      strategy: 'sliding-window',
      limit: 5,
      windowMs: 10000,
    };

    reflector.get.mockReturnValue(options);
    mockStrategy.isAllowed.mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(
      TooManyRequestsException,
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'rate_limit.blocked',
      expect.objectContaining({
        ip: 'unknown',
        routeKey: 'GET:/demo/sliding:unknown',
      }),
    );
  });

  it('should use correct strategy for token-bucket', async () => {
    const context = createMockContext();
    const options: RateLimitOptions = {
      strategy: 'token-bucket',
      capacity: 10,
      refillTokens: 5,
      refillIntervalMs: 10000,
    };

    reflector.get.mockReturnValue(options);
    mockStrategy.isAllowed.mockResolvedValue(true);

    await guard.canActivate(context);

    expect(strategyFactory.create).toHaveBeenCalledWith('token-bucket');
  });
});

