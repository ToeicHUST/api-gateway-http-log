import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { VALID_BEARER_TOKEN } from './common/constants/bearer-token.constant';
import { main } from './common/utils/main.util';

describe('ApiLogs E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await main(AppModule);
  });

  describe('POST /api/api-logs - Authorization', () => {
    it('should reject request without authorization token', async () => {
      const logData = {
        client_ip: '192.168.1.1',
        request: { uri: '/api/test', method: 'GET' },
      };

      await request(app.getHttpServer())
        .post('/api/api-logs')
        .send(logData)
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      const logData = {
        client_ip: '192.168.1.1',
        request: { uri: '/api/test', method: 'GET' },
      };

      await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', 'Bearer invalid-token')
        .send(logData)
        .expect(401);
    });

    it('should reject request with empty token', async () => {
      const logData = {
        client_ip: '192.168.1.1',
        request: { uri: '/api/test', method: 'GET' },
      };

      await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', '')
        .send(logData)
        .expect(401);
    });
  });

  describe('POST /api/api-logs - Bulk and Single Ingestion', () => {
    it('should create a single log entry with valid token', async () => {
      const logData = {
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

      const response = await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', VALID_BEARER_TOKEN)
        .send(logData)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toBeDefined();
      // expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toBeDefined();
    });

    it('should create multiple log entries', async () => {
      const logsData = [
        {
          client_ip: '192.168.1.1',
          request: { uri: '/api/test1', method: 'GET' },
          response: { status: 200 },
        },
        {
          client_ip: '192.168.1.2',
          request: { uri: '/api/test2', method: 'POST' },
          response: { status: 201 },
        },
      ];

      const response = await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', VALID_BEARER_TOKEN)
        .send(logsData)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toBeDefined();
      // expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toHaveLength(logsData.length);
      expect(response.body[0]).toBeDefined();
    });

    it('should handle log entry with minimal data', async () => {
      const logData = {
        client_ip: '192.168.1.1',
      };

      const response = await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', VALID_BEARER_TOKEN)
        .send(logData)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toBeDefined();
      // expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toBeDefined();
    });

    it('should handle log entry with complex nested data', async () => {
      const logData = {
        client_ip: '192.168.1.1',
        request: {
          uri: '/api/complex',
          method: 'POST',
          headers: {
            host: 'example.com',
            'user-agent': 'Mozilla/5.0',
            'content-type': 'application/json',
          },
          body: {
            data: {
              nested: {
                deep: {
                  value: 'test',
                },
              },
            },
          },
        },
        response: {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
          body: {
            success: true,
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          userId: '12345',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', VALID_BEARER_TOKEN)
        .send(logData)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toBeDefined();
      // expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toBeDefined();
    });

    it('should handle empty ingestion', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', VALID_BEARER_TOKEN)
        .send({})
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should handle empty array', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/api-logs')
        .set('Authorization', VALID_BEARER_TOKEN)
        .send([])
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });
});
