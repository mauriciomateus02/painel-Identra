import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library.js';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service.js';
import { PublicService, PublicUser } from '../../core/auth/auth.types.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  imageUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

const userWithServicesSelect = {
  ...userPublicSelect,
  userServices: {
    select: {
      service: true,
    },
  },
};

const userWithPasswordAndServicesSelect = {
  ...userWithServicesSelect,
  password: true,
};

type PrismaUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl: string | null;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserRecord = Omit<PrismaUser, 'password'>;

type UserWithServices = UserRecord & {
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
};

type UserWithPasswordAndServices = PrismaUser & {
  userServices: UserWithServices['userServices'];
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: this.normalizeEmail(dto.email),
          phone: dto.phone.trim(),
          imageUrl: dto.imageUrl,
          password: await bcrypt.hash(dto.password, 12),
          role: dto.role?.trim().toUpperCase() ?? 'CLIENT',
        },
        select: userPublicSelect,
      });

      return this.toPublicUser(user);
    } catch (error) {
      this.throwPersistenceError(error, 'A user with this email already exists');
    }
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{
    data: PublicUser[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
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
              email: {
                contains: search.trim(),
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.toPublicUser(user)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, includeServices = false): Promise<PublicUser> {
    const user = includeServices
      ? await this.prisma.user.findUnique({
          where: { id },
          select: userWithServicesSelect,
        })
      : await this.prisma.user.findUnique({
          where: { id },
          select: userPublicSelect,
        });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user as UserWithServices | PrismaUser);
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findByEmailWithServices(
    email: string,
  ): Promise<UserWithPasswordAndServices | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: userWithPasswordAndServicesSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const data = {
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.email === undefined
        ? {}
        : { email: this.normalizeEmail(dto.email) }),
      ...(dto.phone === undefined ? {} : { phone: dto.phone.trim() }),
      ...(dto.imageUrl === undefined ? {} : { imageUrl: dto.imageUrl }),
      ...(dto.password === undefined
        ? {}
        : { password: await bcrypt.hash(dto.password, 12) }),
      ...(dto.role === undefined
        ? {}
        : { role: dto.role.trim().toUpperCase() }),
    };

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        select: userPublicSelect,
      });
      return this.toPublicUser(user);
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException('User not found');
      }
      this.throwPersistenceError(error, 'A user with this email already exists');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async getServices(userId: string): Promise<PublicService[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        userServices: {
          select: { service: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.userServices.map(({ service }) => service);
  }

  async assignService(userId: string, serviceId: string): Promise<void> {
    await this.ensureUserExists(userId);
    try {
      await this.prisma.userService.create({
        data: { userId, serviceId },
      });
    } catch (error) {
      if (this.isForeignKeyError(error)) {
        throw new NotFoundException('User or service not found');
      }
      if (this.isUniqueError(error)) {
        throw new ConflictException('Service is already assigned to user');
      }
      throw error;
    }
  }

  async removeService(userId: string, serviceId: string): Promise<void> {
    try {
      await this.prisma.userService.delete({
        where: { userId_serviceId: { userId, serviceId } },
      });
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException('Service assignment not found');
      }
      throw error;
    }
  }

  private async ensureUserExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicUser(
    user: UserRecord | UserWithServices,
  ): PublicUser {
    const withServices = user as UserWithServices;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      imageUrl: user.imageUrl,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      ...(withServices.userServices
        ? {
            services: withServices.userServices.map(
              ({ service }) => service,
            ),
          }
        : {}),
    };
  }

  private isUniqueError(error: unknown): boolean {
    return error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002';
  }

  private isForeignKeyError(error: unknown): boolean {
    return error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2003';
  }

  private isRecordNotFound(error: unknown): boolean {
    return error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025';
  }

  private throwPersistenceError(error: unknown, message: string): never {
    if (this.isUniqueError(error)) {
      throw new ConflictException(message);
    }
    throw error;
  }
}
