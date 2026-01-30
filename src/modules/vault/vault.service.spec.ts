import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VaultService } from './vault.service';
import Vault from 'node-vault';

jest.mock('node-vault');

describe('VaultService', () => {
  let service: VaultService;
  let configService: ConfigService;
  let mockVaultClient: any;

  beforeEach(async () => {
    mockVaultClient = {
      approleLogin: jest.fn(),
      read: jest.fn(),
      token: null,
    };

    (Vault as jest.Mock).mockReturnValue(mockVaultClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VaultService>(VaultService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadSecrets', () => {
    it('should throw error when VAULT_ADDR is missing', async () => {
      // Thiết lập config thiếu VAULT_ADDR
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VAULT_ROLE_ID') return 'test-role-id';
        if (key === 'VAULT_SECRET_ID') return 'test-secret-id';
        return undefined;
      });

      await expect(service.loadSecrets()).rejects.toThrow(
        'Missing Vault configuration',
      );
    });

    it('should throw error when VAULT_ROLE_ID is missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VAULT_ADDR') return 'http://localhost:8200';
        if (key === 'VAULT_SECRET_ID') return 'test-secret-id';
        return undefined;
      });

      await expect(service.loadSecrets()).rejects.toThrow(
        'Missing Vault configuration',
      );
    });

    it('should throw error when VAULT_SECRET_ID is missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VAULT_ADDR') return 'http://localhost:8200';
        if (key === 'VAULT_ROLE_ID') return 'test-role-id';
        return undefined;
      });

      await expect(service.loadSecrets()).rejects.toThrow(
        'Missing Vault configuration',
      );
    });

    it('should successfully connect to Vault and fetch secrets with KV v2 engine', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
          VAULT_DATA_PATH: 'secret/data/myapp',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: {
          data: { DB_HOST: 'localhost', DB_PORT: '5432' },
          metadata: { version: 1 },
        },
      });

      await service.loadSecrets();

      expect(mockVaultClient.approleLogin).toHaveBeenCalledWith({
        role_id: 'test-role-id',
        secret_id: 'test-secret-id',
      });
      expect(mockVaultClient.token).toBe('test-token');
      expect(mockVaultClient.read).toHaveBeenCalledWith('secret/data/myapp');
    });

    it('should successfully fetch secrets with KV v1 engine', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
          VAULT_DATA_PATH: 'secret/myapp',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: { API_KEY: 'secret-key', DB_PASSWORD: 'password123' },
      });

      await service.loadSecrets();

      expect(service.get('API_KEY')).toBe('secret-key');
      expect(service.get('DB_PASSWORD')).toBe('password123');
    });

    it('should override Vault secrets with ENV variables in development mode', async () => {
      // Mock development environment
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
          VAULT_DATA_PATH: 'secret/data/myapp',
          DB_HOST: 'localhost-override', // ENV override
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: {
          data: { DB_HOST: 'vault-host', DB_PORT: '5432' },
          metadata: { version: 1 },
        },
      });

      await service.loadSecrets();

      expect(service.get('DB_HOST')).toBe('localhost-override');
      expect(service.get('DB_PORT')).toBe('5432');
    });

    it('should not override Vault secrets with empty ENV variables in development mode', async () => {
      // Test trường hợp ENV có giá trị rỗng
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'development',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
          DB_HOST: '', // Empty string không nên override
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: {
          data: { DB_HOST: 'vault-host' },
          metadata: { version: 1 },
        },
      });

      await service.loadSecrets();

      expect(service.get('DB_HOST')).toBe('vault-host');
    });

    it('should throw error when Vault login fails', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockRejectedValue(
        new Error('Authentication failed'),
      );

      await expect(service.loadSecrets()).rejects.toThrow(
        'Authentication failed',
      );
    });

    it('should throw error when reading Vault path fails', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
          VAULT_DATA_PATH: 'secret/data/myapp',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockRejectedValue(new Error('Path not found'));

      await expect(service.loadSecrets()).rejects.toThrow('Path not found');
    });

    it('should use default VAULT_DATA_PATH when not provided', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: { data: {}, metadata: { version: 1 } },
      });

      await service.loadSecrets();

      expect(mockVaultClient.read).toHaveBeenCalledWith('secret/data/myapp');
    });
  });

  describe('get', () => {
    it('should return secret value for existing key', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: {
          data: { API_KEY: 'my-secret-key' },
          metadata: { version: 1 },
        },
      });

      await service.loadSecrets();

      expect(service.get('API_KEY')).toBe('my-secret-key');
    });

    it('should return undefined for non-existing key', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: { data: {}, metadata: { version: 1 } },
      });

      await service.loadSecrets();

      expect(service.get('NON_EXISTING_KEY')).toBeUndefined();
    });

    it('should return typed value when type parameter is provided', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          VAULT_ADDR: 'http://localhost:8200',
          VAULT_ROLE_ID: 'test-role-id',
          VAULT_SECRET_ID: 'test-secret-id',
        };
        return config[key];
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      mockVaultClient.read.mockResolvedValue({
        data: {
          data: { PORT: '3000', IS_ENABLED: 'true' },
          metadata: { version: 1 },
        },
      });

      await service.loadSecrets();

      const port = service.get<string>('PORT');
      const isEnabled = service.get<string>('IS_ENABLED');

      expect(port).toBe('3000');
      expect(isEnabled).toBe('true');
    });

    it('should fallback to empty object when response.data is null in KV v1', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VAULT_ADDR') return 'http://localhost:8200';
        if (key === 'VAULT_ROLE_ID') return 'test-role-id';
        if (key === 'VAULT_SECRET_ID') return 'test-secret-id';
        return undefined;
      });

      mockVaultClient.approleLogin.mockResolvedValue({
        auth: { client_token: 'test-token' },
      });

      // Giả lập response.data là null để kích hoạt nhánh || {}
      mockVaultClient.read.mockResolvedValue({ data: null });

      await service.loadSecrets();

      // Kiểm tra xem service có chạy tiếp mà không crash và secrets là rỗng
      expect(service.get('ANY_KEY')).toBeUndefined();
    });
  });
});
