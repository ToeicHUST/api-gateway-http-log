import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiLogsModule } from './modules/api-logs/api-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',

          url: configService.get(
            'MICROSERVICES_API_GATEWAY_HTTP_LOG_DATABASE_URL',
          ),

          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          autoLoadEntities: true,

          logging:
            configService.get<string>('NODE_ENV') === 'development'
              ? true
              : false,
          // synchronize:
          //   configService.get<string>('NODE_ENV') === 'production'
          //     ? false
          //     : true,
          synchronize: true,

          ssl: configService.get<string>('NODE_ENV') === 'test' ? false : true,
          extra: {
            ssl:
              configService.get<string>('NODE_ENV') === 'test'
                ? false
                : { rejectUnauthorized: false },
            max: 1,
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
