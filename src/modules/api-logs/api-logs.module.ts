import { Module } from '@nestjs/common';
import { ApiLogsService } from './api-logs.service';
import { ApiLogsController } from './api-logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLog } from './entities/api-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiLog])],
  controllers: [ApiLogsController],
  providers: [ApiLogsService],
})
export class ApiLogsModule {}
