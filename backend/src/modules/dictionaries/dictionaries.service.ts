import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DictionariesService {
  constructor(private readonly prisma: PrismaService) {}

  districts() {
    return this.prisma.district.findMany({ orderBy: { name: 'asc' } });
  }

  categories() {
    return this.prisma.taskCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  }
}
