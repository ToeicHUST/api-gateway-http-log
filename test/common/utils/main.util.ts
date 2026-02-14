import { Test, TestingModule } from '@nestjs/testing';

export async function main(module: any) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [module],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();

  (global as any).app = app;
  return app;
}
