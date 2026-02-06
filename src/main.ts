import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logAppBootstrap, setupSwagger } from '@toeichust/common';
import { VaultService } from '@toeichust/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(`api`);

  const vaultService = app.get(VaultService);

  setupSwagger(app);

  const port =
    vaultService.get<number>('MICROSERVICES_API_GATEWAY_HTTP_LOG_PORT') || 3000;
  await app.listen(port);

  console.log('='.repeat(100));

  logAppBootstrap(app);

  console.log('='.repeat(100));
}
bootstrap();
