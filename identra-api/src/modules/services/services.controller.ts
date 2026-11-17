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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator.js';
import { RolesGuard } from '../../core/auth/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServicesService } from './services.service.js';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service' })
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  @ApiOperation({ summary: 'List services with pagination' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.servicesService.findAll(
      this.parsePositiveInteger(page, 1),
      this.parsePositiveInteger(limit, 20, 100),
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findById(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List clients assigned to a service' })
  getUsers(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getUsers(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiOperation({ summary: 'Delete a service' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.servicesService.remove(id);
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
