import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  const usersService = {
    findByEmailWithServices: vi.fn(),
  } as unknown as UsersService;
  const jwtService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
  } as unknown as JwtService;
  const configService = {
    getOrThrow: vi.fn((key: string) =>
      key === 'JWT_SECRET' ? 'access-secret' : 'refresh-secret',
    ),
    get: vi.fn((key: string) =>
      key === 'JWT_EXPIRES_IN' ? '15m' : '7d',
    ),
  } as unknown as ConfigService;
  const authService = new AuthService(
    usersService,
    jwtService,
    configService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid credentials without revealing whether the email exists', async () => {
    usersService.findByEmailWithServices = vi.fn().mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'password',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('issues a token and returns only public user data', async () => {
    const password = await bcrypt.hash('password', 4);
    usersService.findByEmailWithServices = vi.fn().mockResolvedValue({
      id: 'user-id',
      name: 'Client',
      email: 'client@example.com',
      phone: '555-0100',
      imageUrl: null,
      password,
      role: 'CLIENT',
      createdAt: new Date(),
      updatedAt: new Date(),
      userServices: [],
    });
    jwtService.signAsync = vi
      .fn()
      .mockResolvedValueOnce('signed-token')
      .mockResolvedValueOnce('refresh-token');

    const response = await authService.login({
      email: 'CLIENT@example.com',
      password: 'password',
    });

    expect(response).toEqual(
      expect.objectContaining({
        accessToken: 'signed-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          email: 'client@example.com',
          role: 'CLIENT',
          services: [],
        }),
      }),
    );
    expect(response.user).not.toHaveProperty('password');
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        sub: 'user-id',
        email: 'client@example.com',
        role: 'CLIENT',
        type: 'access',
      },
      expect.objectContaining({ secret: 'access-secret' }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 'user-id',
        email: 'client@example.com',
        role: 'CLIENT',
        type: 'refresh',
      },
      expect.objectContaining({ secret: 'refresh-secret' }),
    );
  });
});
