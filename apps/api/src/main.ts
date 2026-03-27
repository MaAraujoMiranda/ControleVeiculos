import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(require('express').json({ limit: '15mb' }));
  app.use(require('express').urlencoded({ limit: '15mb', extended: true }));
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3333);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000',
  );
  const httpAccessLogsEnabled =
    configService.get<string>('HTTP_ACCESS_LOGS', 'true') !== 'false';
  const httpLogger = new Logger('HTTP');

  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  if (httpAccessLogsEnabled) {
    app.use((request: Request, response: Response, next: NextFunction) => {
      const startedAt = process.hrtime.bigint();
      const method = request.method;
      const path = request.originalUrl ?? request.url ?? '/';
      const forwardedFor = request.headers['x-forwarded-for'];
      const clientIp =
        typeof forwardedFor === 'string'
          ? forwardedFor.split(',')[0].trim()
          : request.ip ?? request.socket.remoteAddress ?? '-';

      response.on('finish', () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const statusCode = response.statusCode;
        const authSession = (request as Request & {
          authSession?: { email?: string };
        }).authSession;
        const user = authSession?.email ?? 'anonimo';
        const entry = `${method} ${path} -> ${statusCode} em ${elapsedMs.toFixed(
          1,
        )}ms | ip=${clientIp} | user=${user}`;

        if (statusCode >= 500) {
          httpLogger.error(entry);
          return;
        }
        if (statusCode >= 400) {
          httpLogger.warn(entry);
          return;
        }
        httpLogger.log(entry);
      });

      next();
    });
  }
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Controle de Veiculos API')
      .setDescription('API inicial do projeto de controle de veiculos.')
      .setVersion('0.1.0')
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);
}
void bootstrap();
