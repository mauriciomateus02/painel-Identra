import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../../core/auth/auth.types.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { LoginResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renew access and refresh tokens' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user and services' })
  async me(@Req() request: AuthenticatedRequest) {
    return this.usersService.findById(request.user.sub, true);
  }
}
