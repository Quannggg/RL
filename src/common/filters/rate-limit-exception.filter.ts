import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception';

@Catch(TooManyRequestsException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: TooManyRequestsException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    res.status(429).json({
      statusCode: 429,
      message: exception.message,
      error: 'Too Many Requests',
    });
  }
}
