import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const logger = new Logger('Bootstrap');

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason as Error);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
