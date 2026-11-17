import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { PublicUser } from '../../core/auth/auth.types.js';
import { UsersService } from '../users/users.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LoginDto } from './dto/login.dto.js';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl: string | null;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  userServices: Array<{
    service: {
      id: string;
      name: string;
      type: string;
      url: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
}

interface RefreshPayload {
  sub: string;
  email: string;
  role: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithServices(dto.email);
    const validPassword = user
      ? await bcrypt.compare(dto.password, user.password)
      : false;

    if (!user || !validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
          ),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      payload.type !== 'refresh' ||
      !payload.sub ||
      !payload.email ||
      !payload.role
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub, true);
    return this.issueTokens(user);
  }

  private async issueTokens(user: AuthUser | PublicUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        {
          secret: this.configService.getOrThrow<string>('JWT_SECRET'),
          expiresIn: this.getExpiresIn('JWT_EXPIRES_IN', '15m'),
        },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
          ),
          expiresIn: this.getExpiresIn('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: AuthUser | PublicUser): PublicUser {
    const services =
      'userServices' in user
        ? user.userServices.map(({ service }) => service)
        : user.services;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      imageUrl: user.imageUrl,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      ...(services ? { services } : {}),
    };
  }

  private getExpiresIn(
    key: string,
    fallback: string,
  ): SignOptions['expiresIn'] {
    return (this.configService.get<string>(key) ?? fallback) as SignOptions['expiresIn'];
  }
}
