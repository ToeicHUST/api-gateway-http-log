import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Vault from 'node-vault';

@Injectable()
export class VaultService {
  constructor(private configService: ConfigService) {}

  private readonly logger = new Logger(VaultService.name);
  private vaultClient: Vault.client;
  private secrets: Record<string, any> = {};

  async loadSecrets() {
    this.logger.log('Đang kết nối tới Vault...');

    const NODE_ENV = this.configService.get<string>('NODE_ENV');
    const isDevelopment = NODE_ENV === 'development';

    const VAULT_ADDR = this.configService.get<string>('VAULT_ADDR');
    const VAULT_ROLE_ID = this.configService.get<string>('VAULT_ROLE_ID');
    const VAULT_SECRET_ID = this.configService.get<string>('VAULT_SECRET_ID');
    const VAULT_DATA_PATH = this.configService.get<string>('VAULT_DATA_PATH');

    if (!VAULT_ADDR || !VAULT_ROLE_ID || !VAULT_SECRET_ID) {
      this.logger.error('Thiếu cấu hình Vault (ADDR, ROLE_ID hoặc SECRET_ID)');
      throw new Error('Missing Vault configuration');
    }

    // Khởi tạo client
    this.vaultClient = Vault({
      apiVersion: 'v1',
      endpoint: VAULT_ADDR,
    });

    try {
      const loginResult = await this.vaultClient.approleLogin({
        role_id: VAULT_ROLE_ID,
        secret_id: VAULT_SECRET_ID,
      });

      this.vaultClient.token = loginResult.auth.client_token;

      const vaultPath = VAULT_DATA_PATH || 'secret/data/myapp';
      const response = await this.vaultClient.read(vaultPath);

      let fetchedSecrets: Record<string, any> = {};

      if (response.data && response.data.data && response.data.metadata) {
        fetchedSecrets = response.data.data; // KV engine v2
      } else {
        fetchedSecrets = response.data || {}; // KV engine v1
      }

      if (isDevelopment) {
        const overriddenKeys: string[] = [];

        Object.keys(fetchedSecrets).forEach((key) => {
          const envValue = this.configService.get(key);

          if (envValue !== undefined && envValue !== null && envValue !== '') {
            fetchedSecrets[key] = envValue;
            overriddenKeys.push(key);
          }
        });

        this.secrets = fetchedSecrets;

        if (overriddenKeys.length > 0) {
          this.logger.warn(
            `⚠️  Các biến sau đây đang sử dụng giá trị từ ENV (ghi đè Vault): ${overriddenKeys.join(', ')}`,
          );
        }
      } else {
        this.secrets = fetchedSecrets;
      }

      this.logger.log('Đã kết nối và lấy dữ liệu thành công từ Vault');
    } catch (error) {
      this.logger.error(`Lỗi kết nối Vault: ${error.message}`, error.stack);
      throw error;
    }
  }

  get<T = string>(key: string): T {
    return this.secrets[key] as T;
  }
}
