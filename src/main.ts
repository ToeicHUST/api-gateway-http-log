import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { logAppBootstrap, setupSwagger } from '@toeichust/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(`api`);

  const configService = app.get(ConfigService);

  setupSwagger(app);

  const port =
    configService.get<number>('MICROSERVICES_API_GATEWAY_HTTP_LOG_PORT') ||
    3000;
  await app.listen(port);

  console.log('='.repeat(100));

  logAppBootstrap(app);

  console.log('='.repeat(100));
}
bootstrap();
