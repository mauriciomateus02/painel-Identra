import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../../core/auth/auth.types.js';
import { Roles } from '../../core/auth/roles.decorator.js';
import { RolesGuard } from '../../core/auth/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a client' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  @ApiOperation({ summary: 'List clients with pagination' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(
      this.parsePositiveInteger(page, 1),
      this.parsePositiveInteger(limit, 20, 100),
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertOwnerOrAdmin(id, request.user);
    return this.usersService.findById(id, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertOwnerOrAdmin(id, request.user);
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiOperation({ summary: 'Delete a client' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    this.assertOwnerOrAdmin(id, request.user);
    await this.usersService.remove(id);
  }

  @Get(':id/services')
  @ApiOperation({ summary: 'List services assigned to a client' })
  getServices(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertOwnerOrAdmin(id, request.user);
    return this.usersService.getServices(id);
  }

  @Post(':id/services/:serviceId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiOperation({ summary: 'Assign a service to a client' })
  async assignService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<void> {
    await this.usersService.assignService(id, serviceId);
  }

  @Delete(':id/services/:serviceId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiOperation({ summary: 'Revoke a service from a client' })
  async removeService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<void> {
    await this.usersService.removeService(id, serviceId);
  }

  private assertOwnerOrAdmin(id: string, user: AuthenticatedUser): void {
    if (user.role !== 'ADMIN' && user.sub !== id) {
      throw new ForbiddenException('You cannot access another user');
    }
  }

  private parsePositiveInteger(
    value: string,
    fallback: number,
    maximum?: number,
  ): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return fallback;
    }
    return maximum ? Math.min(parsed, maximum) : parsed;
  }
}
