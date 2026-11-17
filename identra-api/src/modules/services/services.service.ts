import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library.js';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

const serviceSelect = {
  id: true,
  name: true,
  type: true,
  url: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    try {
      return await this.prisma.service.create({
        data: {
          name: dto.name.trim(),
          type: dto.type.trim(),
          url: dto.url.trim(),
        },
        select: serviceSelect,
      });
    } catch (error) {
      this.throwUniqueError(error);
    }
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ) {
    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search.trim(),
                mode: 'insensitive' as const,
              },
            },
            {
              type: {
                contains: search.trim(),
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        select: serviceSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: serviceSelect,
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    try {
      return await this.prisma.service.update({
        where: { id },
        data: {
          ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
          ...(dto.type === undefined ? {} : { type: dto.type.trim() }),
          ...(dto.url === undefined ? {} : { url: dto.url.trim() }),
        },
        select: serviceSelect,
      });
    } catch (error) {
      if (this.isError(error, 'P2025')) {
        throw new NotFoundException('Service not found');
      }
      this.throwUniqueError(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (error) {
      if (this.isError(error, 'P2025')) {
        throw new NotFoundException('Service not found');
      }
      if (this.isError(error, 'P2003')) {
        throw new ConflictException(
          'Service cannot be deleted while it has assignments',
        );
      }
      throw error;
    }
  }

  async getUsers(id: string) {
    await this.findById(id);
    const assignments = await this.prisma.userService.findMany({
      where: { serviceId: id },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    return assignments.map(({ user }) => user);
  }

  private throwUniqueError(error: unknown): never {
    if (this.isError(error, 'P2002')) {
      throw new ConflictException('A service with this URL already exists');
    }
    throw error;
  }

  private isError(error: unknown, code: string): boolean {
    return error instanceof PrismaClientKnownRequestError &&
      error.code === code;
  }
}
