import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_CONFIG, AppConfig } from './config/app.config';

export const API_PREFIX = 'api/v1';

export function configureApp(app: import('@nestjs/common').INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  configureApp(app);
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('«Иду на помощь!» API')
    .setDescription('Серверная часть MVP: заявки пожилых людей и волонтёры Владивостока')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.port);
  Logger.log(`Сервер: http://localhost:${config.port}/${API_PREFIX}`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${config.port}/api/docs`, 'Bootstrap');
}

if (require.main === module) {
  void bootstrap();
}
