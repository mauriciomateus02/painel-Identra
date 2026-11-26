import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Protegida - Validação de Token Cognito', () => {
  it('permite acesso à rota pública /health sem token (200)', async () => {
    const mockVerifier = { verify: vi.fn() };
    const app = createApp({ verifier: mockVerifier });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('1) Acesso autorizado com token válido do Cognito (200)', async () => {
    const mockVerifier = {
      verify: vi.fn().mockResolvedValue({
        sub: 'user-123',
        iss: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_MCGl44ZQG',
        client_id: '6oaek3jr8jpg2olcpu12omdi67',
        token_use: 'access',
        scope: 'openid email phone',
        username: 'aluno@teste.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };
    const app = createApp({ verifier: mockVerifier });

    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer valid-cognito-jwt');

    expect(res.status).toBe(200);
    expect(res.body.claims.sub).toBe('user-123');
    expect(mockVerifier.verify).toHaveBeenCalledWith('valid-cognito-jwt');
  });

  it('2) Bloqueia acesso sem token (401)', async () => {
    const mockVerifier = { verify: vi.fn() };
    const app = createApp({ verifier: mockVerifier });

    const res = await request(app).get('/api/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockVerifier.verify).not.toHaveBeenCalled();
  });

  it('3) Bloqueia acesso com token expirado ou inválido (401)', async () => {
    const mockVerifier = {
      verify: vi.fn().mockRejectedValue(new Error('Token expired')),
    };
    const app = createApp({ verifier: mockVerifier });

    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer expired-or-invalid-jwt');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.detail).toBe('Token expired');
  });
});

