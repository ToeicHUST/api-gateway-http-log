import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiLogsService } from './api-logs.service';
import { ApiLog } from './entities/api-log.entity';

describe('ApiLogsService', () => {
  let service: ApiLogsService;
  let repository: Repository<ApiLog>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiLogsService,
        {
          provide: getRepositoryToken(ApiLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApiLogsService>(ApiLogsService);
    repository = module.get<Repository<ApiLog>>(getRepositoryToken(ApiLog));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a single log entry', async () => {
      const logDto = {
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
      };

      const mockEntity = {
        id: 1,
        client_ip: '192.168.1.1',
        uri: '/api/test',
        method: 'GET',
        host: 'example.com',
        url: 'https://example.com/api/test',
        status: 200,
        metadata: logDto,
      };

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue([mockEntity]);

      const result = await service.create(logDto);

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        client_ip: '192.168.1.1',
        uri: '/api/test',
        method: 'GET',
        host: 'example.com',
        url: 'https://example.com/api/test',
        status: 200,
        metadata: logDto,
      });
      expect(mockRepository.save).toHaveBeenCalledWith([mockEntity]);
      expect(result).toEqual([mockEntity]);
    });

    it('should create and save multiple log entries from an array', async () => {
      const logDtos = [
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
      ];

      const mockEntities = logDtos.map((dto, index) => ({
        id: index + 1,
        client_ip: dto.client_ip,
        uri: dto.request.uri,
        method: dto.request.method,
        host: dto.request.headers.host,
        url: dto.request.url,
        status: dto.response.status,
        metadata: dto,
      }));

      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockResolvedValue(mockEntities);

      const result = await service.create(logDtos);

      expect(mockRepository.create).toHaveBeenCalledTimes(2);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockEntities);
    });

    it('should handle missing nested properties gracefully', async () => {
      const logDto = {
        client_ip: '192.168.1.1',
      };

      const mockEntity = {
        client_ip: '192.168.1.1',
        uri: undefined,
        method: undefined,
        host: undefined,
        url: undefined,
        status: undefined,
        metadata: logDto,
      };

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue([mockEntity]);

      const result = await service.create(logDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        client_ip: '192.168.1.1',
        uri: undefined,
        method: undefined,
        host: undefined,
        url: undefined,
        status: undefined,
        metadata: logDto,
      });
      expect(result).toEqual([mockEntity]);
    });

    it('should handle empty array input', async () => {
      mockRepository.save.mockResolvedValue([]);

      const result = await service.create([]);

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      const logDto = {
        client_ip: '192.168.1.1',
        request: { uri: '/api/test', method: 'GET' },
      };

      const mockEntity = { client_ip: '192.168.1.1' };
      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(logDto)).rejects.toThrow('Database error');
    });
  });
});
