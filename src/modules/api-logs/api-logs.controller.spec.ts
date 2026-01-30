import { Test, TestingModule } from '@nestjs/testing';
import { ApiLogsController } from './api-logs.controller';
import { ApiLogsService } from './api-logs.service';
import { CreateApiLogDto } from './dto/create-api-log.dto';
import { AuthGuard } from './guard/auth.guard';

describe('ApiLogsController', () => {
  let controller: ApiLogsController;
  let service: ApiLogsService;

  const mockApiLogsService = {
    create: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiLogsController],
      providers: [
        {
          provide: ApiLogsService,
          useValue: mockApiLogsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<ApiLogsController>(ApiLogsController);
    service = module.get<ApiLogsService>(ApiLogsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a single log entry', async () => {
      const createLogDto: CreateApiLogDto = {
        client_ip: '192.168.1.1',
        request: {
          uri: '/api/test',
          method: 'GET',
          headers: { host: 'example.com' },
          url: 'https://example.com/api/test',
        },
        response: {
          status: 200,
        },
      } as CreateApiLogDto;

      const mockServiceResponse = [{ id: 1 }];
      mockApiLogsService.create.mockResolvedValue(mockServiceResponse);
      const expectedResult = [1];

      const result = await controller.create(createLogDto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(createLogDto);
      expect(result).toEqual(expectedResult);
    });

    it('should create multiple log entries from an array', async () => {
      const createLogDto: CreateApiLogDto = [
        {
          client_ip: '192.168.1.1',
          request: {
            uri: '/api/test1',
            method: 'GET',
            headers: { host: 'example.com' },
            url: 'https://example.com/api/test1',
          },
          response: { status: 200 },
        },
        {
          client_ip: '192.168.1.2',
          request: {
            uri: '/api/test2',
            method: 'POST',
            headers: { host: 'example.com' },
            url: 'https://example.com/api/test2',
          },
          response: { status: 201 },
        },
      ] as any;

      const mockServiceResponse = [{ id: 1 }, { id: 2 }];
      mockApiLogsService.create.mockResolvedValue(mockServiceResponse);
      const expectedResult = [1, 2];

      const result = await controller.create(createLogDto);

      expect(service.create).toHaveBeenCalledWith(createLogDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle log entry with minimal data', async () => {
      const createLogDto: CreateApiLogDto = {
        client_ip: '192.168.1.1',
      } as CreateApiLogDto;

      const mockServiceResponse = [{ id: 1 }];
      mockApiLogsService.create.mockResolvedValue(mockServiceResponse);
      const expectedResult = [1];

      const result = await controller.create(createLogDto);

      expect(service.create).toHaveBeenCalledWith(createLogDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service returning empty array', async () => {
      const createLogDto: CreateApiLogDto = {
        client_ip: '192.168.1.1',
      } as CreateApiLogDto;

      mockApiLogsService.create.mockResolvedValue([]);

      const result = await controller.create(createLogDto);

      expect(service.create).toHaveBeenCalledWith(createLogDto);
      expect(result).toEqual([]);
    });
  });
});
