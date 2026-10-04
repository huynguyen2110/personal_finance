import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Trạng thái nội bộ dạng key–value (VD: UID email đã đọc tới đâu, kết quả lần đọc gần nhất)
@Injectable()
export class AppStateService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string): Promise<T | null> {
    const row = await this.prisma.appState.findUnique({ where: { key } });
    if (!row) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const v = JSON.stringify(value);
    await this.prisma.appState.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
  }
}
