import { Wait } from 'testcontainers';
import { VaultContainer, StartedVaultContainer } from '@testcontainers/vault';
import Vault from 'node-vault';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { VALID_TOKEN } from './constants/bearer-token.constant';

jest.setTimeout(60000);

let vaultContainer: StartedVaultContainer;
let postgresContainer: StartedPostgreSqlContainer;

async function startVaultContainer(): Promise<StartedVaultContainer> {
  const vaultToken = 'my-root-token';

  const container = await new VaultContainer('hashicorp/vault:1.21')
    .withVaultToken(vaultToken)
    .withWaitStrategy(Wait.forHttp('/v1/sys/health', 8200))
    .withStartupTimeout(120000)
    .start();

  return container;
}

async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_pass')
    .withExposedPorts(5432)
    .withStartupTimeout(120000)
    .start();

  return container;
}

async function setupAppRole(container: StartedVaultContainer) {
  await container.exec(['vault', 'auth', 'enable', 'approle']);

  const policy =
    'path "secret/*" { capabilities = ["create", "read", "update", "delete", "list"] }';
  await container.exec([
    'sh',
    '-c',
    `echo '${policy}' | vault policy write my-policy -`,
  ]);

  await container.exec([
    'vault',
    'write',
    'auth/approle/role/my-role',
    'token_policies=my-policy',
    'token_ttl=1h',
    'token_max_ttl=4h',
  ]);

  const roleIdRes = await container.exec([
    'vault',
    'read',
    '-format=json',
    'auth/approle/role/my-role/role-id',
  ]);
  const secretIdRes = await container.exec([
    'vault',
    'write',
    '-f',
    '-format=json',
    'auth/approle/role/my-role/secret-id',
  ]);

  const roleId = JSON.parse(roleIdRes.output).data.role_id;
  const secretId = JSON.parse(secretIdRes.output).data.secret_id;

  return { roleId, secretId };
}

async function seedVaultSecrets(): Promise<void> {
  const credentials = await setupAppRole(vaultContainer);

  process.env.VAULT_ADDR = vaultContainer.getAddress();
  process.env.VAULT_ROLE_ID = credentials.roleId;
  process.env.VAULT_SECRET_ID = credentials.secretId;
  process.env.VAULT_DATA_PATH = 'secret/data/config';

  const VAULT_ADDR = process.env.VAULT_ADDR;
  const VAULT_ROLE_ID = process.env.VAULT_ROLE_ID;
  const VAULT_SECRET_ID = process.env.VAULT_SECRET_ID;
  const VAULT_DATA_PATH = process.env.VAULT_DATA_PATH;

  const client: Vault.client = Vault({
    apiVersion: 'v1',
    endpoint: VAULT_ADDR,
  });

  const loginResult = await client.approleLogin({
    role_id: VAULT_ROLE_ID,
    secret_id: VAULT_SECRET_ID,
  });

  client.token = loginResult.auth.client_token;

  await client.write(VAULT_DATA_PATH, {
    data: {
      DECK_LOG_BEARER_TOKEN: VALID_TOKEN,

      MICROSERVICES_DB_HOST: postgresContainer.getHost(),
      MICROSERVICES_DB_PORT: postgresContainer.getPort(),
      MICROSERVICES_DB_USERNAME: postgresContainer.getUsername(),
      MICROSERVICES_DB_PASSWORD: postgresContainer.getPassword(),
      MICROSERVICES_DB_DATABASE: postgresContainer.getDatabase(),
      MICROSERVICES_API_GATEWAY_HTTP_LOG_DB_SCHEMA: 'public',
    },
  });

  const response = await client.read(VAULT_DATA_PATH);

  console.log('Secret Data:', response.data.data);
}

beforeAll(async () => {
  try {
    [vaultContainer, postgresContainer] = await Promise.all([
      startVaultContainer(),
      startPostgresContainer(),
    ]);

    await seedVaultSecrets();
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await Promise.all([
      vaultContainer?.stop().catch((err) => {
        console.warn('Warning: Failed to stop Vault container:', err.message);
      }),
      postgresContainer?.stop().catch((err) => {
        console.warn(
          'Warning: Failed to stop PostgreSQL container:',
          err.message,
        );
      }),
    ]);
  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
  }

  const app = (global as any).app;
  if (app) {
    await app.close();
    (global as any).app = null;
  }
});
