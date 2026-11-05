import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('WEB_ORIGIN', 'http://localhost:5173') });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const swagger = new DocumentBuilder()
    .setTitle('SmartShelf API')
    .setVersion('0.1.0')
    .setDescription(
      'Authentication and pharmacy-scoped inventory backed by Prisma and PostgreSQL. See docs/API-CONTRACT.md for the team contract.',
    )
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );
  app.enableShutdownHooks();
  const port = Number(config.get('PORT', 3000));
  await app.listen(port, '127.0.0.1');
  Logger.log(
    `API: http://localhost:${port}/api/health | Swagger: /api/docs`,
    'Bootstrap',
  );
}
void bootstrap();
