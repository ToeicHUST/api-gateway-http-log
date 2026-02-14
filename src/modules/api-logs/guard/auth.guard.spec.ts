import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let configService: ConfigService;
  let mockExecutionContext: ExecutionContext;

  // Mock token từ ConfigService
  const VALID_TOKEN = 'valid-bearer-token-12345';
  const VALID_BEARER_TOKEN = `Bearer ${VALID_TOKEN}`;

  beforeEach(() => {
    // Mock ConfigService
    configService = {
      get: jest.fn().mockReturnValue(VALID_TOKEN),
    } as any;

    // Khởi tạo AuthGuard với mock ConfigService
    authGuard = new AuthGuard(configService);

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(authGuard).toBeDefined();
    });

    describe('AuthGuard - Authorization', () => {
      it('should throw UnauthorizedException when authorization header is missing', async () => {
        // Arrange
        const mockRequest = {
          headers: {}, // Không có authorization header
        };

        (
          mockExecutionContext.switchToHttp().getRequest as jest.Mock
        ).mockReturnValue(mockRequest);

        // Act & Assert
        // Phải sử dụng await và .rejects vì canActivate là hàm async
        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);

        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow('Thiếu hoặc sai định dạng Authorization header');
      });

      it('should throw UnauthorizedException when authorization header is undefined', async () => {
        // Arrange
        const mockRequest = {
          headers: {
            authorization: undefined,
          },
        };

        (
          mockExecutionContext.switchToHttp().getRequest as jest.Mock
        ).mockReturnValue(mockRequest);

        // Act & Assert
        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when authorization header is null', async () => {
        // Arrange
        const mockRequest = {
          headers: {
            authorization: null,
          },
        };

        (
          mockExecutionContext.switchToHttp().getRequest as jest.Mock
        ).mockReturnValue(mockRequest);

        // Act & Assert
        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when authorization header is empty string', async () => {
        // Arrange
        const mockRequest = {
          headers: {
            authorization: '',
          },
        };

        (
          mockExecutionContext.switchToHttp().getRequest as jest.Mock
        ).mockReturnValue(mockRequest);

        // Act & Assert
        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('AuthGuard - Token', () => {
      it('should return true when authorization header matches valid token', async () => {
        // Arrange
        const mockRequest = {
          headers: {
            authorization: VALID_BEARER_TOKEN, // Dùng Bearer token đầy đủ
          },
        };

        (
          mockExecutionContext.switchToHttp().getRequest as jest.Mock
        ).mockReturnValue(mockRequest);

        // Act
        const result = await authGuard.canActivate(mockExecutionContext);

        // Assert
        expect(result).toBe(true);
        expect(configService.get).toHaveBeenCalledWith('DECK_LOG_BEARER_TOKEN');
      });

      it('should throw UnauthorizedException when token is invalid', async () => {
        // Arrange
        const mockRequest = {
          headers: {
            authorization: 'Bearer invalid-token',
          },
        };

        (
          mockExecutionContext.switchToHttp().getRequest as jest.Mock
        ).mockReturnValue(mockRequest);

        // Act & Assert
        // Luôn sử dụng rejects.toThrow cho hàm async để tránh log lỗi ra terminal
        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);

        await expect(
          authGuard.canActivate(mockExecutionContext),
        ).rejects.toThrow('Token không hợp lệ');
      });
    });
  });
});
