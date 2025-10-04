// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RateLimitExceptionFilter } from './common/filters/rate-limit-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new RateLimitExceptionFilter());
  await app.listen(3000);
  console.log('API on http://localhost:3000');
}
void bootstrap();
