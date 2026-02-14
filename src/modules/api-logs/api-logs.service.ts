import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiLog } from './entities/api-log.entity';

@Injectable()
export class ApiLogsService {
  constructor(
    @InjectRepository(ApiLog)
    private readonly logRepository: Repository<ApiLog>,
  ) {}

  async create(createLogDto: any) {
    const logsInput = Array.isArray(createLogDto)
      ? createLogDto
      : [createLogDto];

    const entities = logsInput.map((item) => {
      return this.logRepository.create({
        client_ip: item.client_ip,
        uri: item.request?.uri,
        method: item.request?.method,
        host: item.request?.headers?.host,
        url: item.request?.url,
        status: item.response?.status,
        metadata: item,
      });
    });

    return await this.logRepository.save(entities);
  }
}
