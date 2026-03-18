import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appServiceMock = {
    getHealth: jest.fn().mockResolvedValue({
      name: 'controle-acesso-api',
      status: 'ok',
      version: '0.1.0',
      database: {
        configured: true,
        status: 'connected',
      },
      timestamp: new Date().toISOString(),
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return the api status payload', async () => {
      const result = await appController.getHealth();

      expect(result.name).toBe('controle-acesso-api');
      expect(result.status).toBe('ok');
      expect(result.version).toBe('0.1.0');
      expect(result.database.status).toBe('connected');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
