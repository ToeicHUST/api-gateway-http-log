import { Global, Module } from '@nestjs/common';
import { VaultService } from './vault.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: VaultService,
      useFactory: async (configService: ConfigService) => {
        const vaultService = new VaultService(configService);

        await vaultService.loadSecrets();

        return vaultService;
      },
      inject: [ConfigService],
    },
  ],
  exports: [VaultService],
})
export class VaultModule {}
