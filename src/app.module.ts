import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ApiLogsModule } from './modules/api-logs/api-logs.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultModule } from '@toeichust/common';
import { VaultService } from '@toeichust/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VaultModule,

    TypeOrmModule.forRootAsync({
      inject: [VaultService],
      useFactory: (vaultService: VaultService) => {
        return {
          type: 'postgres',
          host: vaultService.get<string>('MICROSERVICES_DB_HOST'),
          port:
            parseInt(vaultService.get<string>('MICROSERVICES_DB_PORT'), 10) ||
            5432,
          username: vaultService.get<string>('MICROSERVICES_DB_USERNAME'),
          password: vaultService.get<string>('MICROSERVICES_DB_PASSWORD'),
          database: vaultService.get<string>('MICROSERVICES_DB_DATABASE'),
          schema:
            vaultService.get<string>(
              'MICROSERVICES_API_GATEWAY_HTTP_LOG_DB_SCHEMA',
            ) || 'public',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],

          logging:
            vaultService.get<string>('MICROSERVICES_DB_DATABASE') ===
            'development'
              ? true
              : false,
          synchronize:
            vaultService.get<string>('MICROSERVICES_DB_DATABASE') ===
            'production'
              ? false
              : true,

          extra: {
            max: 1, // Cực kỳ quan trọng cho Serverless
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),

    ApiLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
