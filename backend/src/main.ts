import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppConfigService } from './common/config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);

  app.use(
    helmet({
      // The API is JSON-only and consumed by a separate frontend origin;
      // there is no server-rendered HTML here for a CSP to protect.
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());
  // Reflects the request origin only in development so the Vite dev server
  // (any localhost port) can call the API with credentials; in production
  // it is pinned to the configured frontend origin.
  app.enableCors({
    origin: config.isProduction ? config.appUrl : true,
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.port);
  // eslint-disable-next-line no-console
  console.log(`Zarghoon Jewellers ERP API listening on http://localhost:${config.port}/api/v1`);
}

bootstrap();
