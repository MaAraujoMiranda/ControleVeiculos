import cookieParser from 'cookie-parser';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'http';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/auth/login -> /me -> /logout', async () => {
    const agent = request.agent(app.getHttpServer());

    const loginResponse = await agent.post('/api/v1/auth/login').send({
      email: 'admin@controle.local',
      password: 'Admin@123456',
    });
    const loginBody = loginResponse.body as {
      user: {
        email: string;
      };
    };

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers['set-cookie']).toBeDefined();
    expect(loginBody.user.email).toBe('admin@controle.local');

    const meResponse = await agent.get('/api/v1/auth/me');
    const meBody = meResponse.body as {
      user: {
        role: string;
      };
      expiresAt: string;
    };

    expect(meResponse.status).toBe(200);
    expect(meBody.user.role).toBe('ADMIN');
    expect(meBody.expiresAt).toEqual(expect.any(String));

    const logoutResponse = await agent.post('/api/v1/auth/logout');

    expect(logoutResponse.status).toBe(200);

    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          name: string;
          status: string;
          database: {
            configured: boolean;
            status: string;
          };
        };

        expect(body.name).toBe('controle-acesso-api');
        expect(typeof body.status).toBe('string');
        expect(typeof body.database.configured).toBe('boolean');
        expect(typeof body.database.status).toBe('string');
      });
  });
});
