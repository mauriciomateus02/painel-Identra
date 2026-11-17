import { PrismaService } from '../../infrastructure/database/prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('normalizes email and hashes the password when creating a user', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'user-id',
      name: 'Client',
      email: 'client@example.com',
      phone: '555-0100',
      imageUrl: null,
      role: 'CLIENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const prisma = {
      user: { create },
    } as unknown as PrismaService;
    const usersService = new UsersService(prisma);

    await usersService.create({
      name: ' Client ',
      email: ' CLIENT@EXAMPLE.COM ',
      phone: ' 555-0100 ',
      password: 'password',
    });

    const [{ data }] = create.mock.calls;
    expect(data).toMatchObject({
      name: 'Client',
      email: 'client@example.com',
      phone: '555-0100',
      role: 'CLIENT',
    });
    expect(data.password).not.toBe('password');
    expect(data.password).toMatch(/^\$2[aby]\$/);
  });
});
