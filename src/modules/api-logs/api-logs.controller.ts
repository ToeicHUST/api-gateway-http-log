import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiLogsService } from './api-logs.service';
import { CreateApiLogDto } from './dto/create-api-log.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { API_LOGS_PATH } from '../../common/constants/api-path.constant';
import { SWAGGER_AUTH_KEY } from '@toeichust/common';
import { AuthGuard } from './guard/auth.guard';

@ApiBearerAuth(SWAGGER_AUTH_KEY)
@ApiTags(API_LOGS_PATH)
@Controller(API_LOGS_PATH)
export class ApiLogsController {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() createApiLogDto: CreateApiLogDto) {
    const results = await this.apiLogsService.create(createApiLogDto);

    return results.map((item) => item.id);
  }
}
