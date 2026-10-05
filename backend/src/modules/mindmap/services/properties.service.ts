import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PropertyDefinition } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ROLE_LABEL, ROLE_TYPE, type CreatePropertyDto, type PropertyRole, type PropertyTypeName, type SetNodeValuesDto, type UpdatePropertyDto } from '../dto/property.dto';
import { MindmapsService } from './mindmaps.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface SelectOption {
  id: string;
  label: string;
  color: string;
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mindmaps: MindmapsService,
  ) {}

  async list(mindmapId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    return this.prisma.propertyDefinition.findMany({ where: { mindmapId }, orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] });
  }

  async create(mindmapId: number, userId: number, dto: CreatePropertyDto) {
    await this.mindmaps.findOwned(mindmapId, userId);
    if (dto.type === 'select' && !dto.options?.length) {
      throw new BadRequestException('Thuộc tính kiểu select cần ít nhất 1 lựa chọn');
    }
    const duplicate = await this.prisma.propertyDefinition.findFirst({ where: { mindmapId, name: dto.name } });
    if (duplicate) throw new BadRequestException('Tên thuộc tính đã tồn tại');
    if (dto.unit && dto.type !== 'number') throw new BadRequestException('Chỉ thuộc tính kiểu number mới có đơn vị');
    if (dto.role) await this.checkRole(mindmapId, dto.role, dto.type);

    const { _max } = await this.prisma.propertyDefinition.aggregate({ where: { mindmapId }, _max: { orderIndex: true } });
    return this.prisma.propertyDefinition.create({
      data: {
        mindmapId,
        name: dto.name,
        type: dto.type,
        options: dto.type === 'select' ? (dto.options as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        role: dto.role ?? null,
        unit: dto.unit ?? null,
        orderIndex: _max.orderIndex === null ? 0 : _max.orderIndex + 1,
      },
    });
  }

  async update(mindmapId: number, propId: number, userId: number, dto: UpdatePropertyDto) {
    const def = await this.findOwnedDefinition(mindmapId, propId, userId);
    const data: Prisma.PropertyDefinitionUpdateInput = {};
    if (dto.name !== undefined && dto.name !== def.name) {
      const duplicate = await this.prisma.propertyDefinition.findFirst({ where: { mindmapId, name: dto.name, NOT: { id: propId } } });
      if (duplicate) throw new BadRequestException('Tên thuộc tính đã tồn tại');
      data.name = dto.name;
    }
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.options !== undefined) {
      if (def.type !== 'select') throw new BadRequestException('Chỉ thuộc tính kiểu select mới có options');
      data.options = dto.options as unknown as Prisma.InputJsonValue;
    }
    if (dto.unit !== undefined) {
      if (dto.unit !== null && def.type !== 'number') throw new BadRequestException('Chỉ thuộc tính kiểu number mới có đơn vị');
      data.unit = dto.unit;
    }
    if (dto.role !== undefined && dto.role !== def.role) {
      if (dto.role !== null) await this.checkRole(mindmapId, dto.role, def.type, propId);
      data.role = dto.role;
    }
    return this.prisma.propertyDefinition.update({ where: { id: propId }, data });
  }

  async remove(mindmapId: number, propId: number, userId: number) {
    await this.findOwnedDefinition(mindmapId, propId, userId);
    await this.prisma.propertyDefinition.delete({ where: { id: propId } });
    return { success: true };
  }

  // Ghi nhiều giá trị thuộc tính của một node; giá trị null = xóa
  async setNodeValues(mindmapId: number, nodeId: number, userId: number, dto: SetNodeValuesDto) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const node = await this.prisma.mindmapNode.findFirst({ where: { id: nodeId, mindmapId }, select: { id: true } });
    if (!node) throw new NotFoundException('Không tìm thấy node');

    const defs = await this.prisma.propertyDefinition.findMany({ where: { mindmapId } });
    const defById = new Map(defs.map((d) => [d.id, d]));

    for (const [key, value] of Object.entries(dto.values)) {
      const defId = Number(key);
      const def = defById.get(defId);
      if (!def) throw new BadRequestException(`Thuộc tính ${key} không thuộc mindmap này`);
      if (value === null) {
        await this.prisma.nodePropertyValue.deleteMany({ where: { nodeId, propertyDefinitionId: defId } });
        continue;
      }
      this.validateValue(def, value);
      const json = value as Prisma.InputJsonValue;
      await this.prisma.nodePropertyValue.upsert({
        where: { nodeId_propertyDefinitionId: { nodeId, propertyDefinitionId: defId } },
        create: { nodeId, propertyDefinitionId: defId, value: json },
        update: { value: json },
      });
    }

    const all = await this.prisma.nodePropertyValue.findMany({ where: { nodeId } });
    return all.map((v) => ({ propertyDefinitionId: v.propertyDefinitionId, value: v.value }));
  }

  private validateValue(def: PropertyDefinition, value: unknown) {
    const fail = () => new BadRequestException(`Giá trị không hợp lệ cho thuộc tính "${def.name}" (kiểu ${def.type})`);
    switch (def.type) {
      case 'text':
        if (typeof value !== 'string') throw fail();
        break;
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) throw fail();
        break;
      case 'boolean':
        if (typeof value !== 'boolean') throw fail();
        break;
      case 'date':
        if (typeof value !== 'string' || !DATE_RE.test(value)) throw fail();
        break;
      case 'select': {
        const options = (def.options as unknown as SelectOption[] | null) ?? [];
        if (typeof value !== 'string' || !options.some((o) => o.id === value)) throw fail();
        break;
      }
    }
  }

  // Role phải hợp kiểu và chưa được thuộc tính khác trong mindmap dùng
  private async checkRole(mindmapId: number, role: PropertyRole, type: PropertyTypeName, exceptId?: number) {
    if (ROLE_TYPE[role] !== type) {
      throw new BadRequestException(`Vai trò "${ROLE_LABEL[role]}" chỉ dùng cho thuộc tính kiểu ${ROLE_TYPE[role]}`);
    }
    const taken = await this.prisma.propertyDefinition.findFirst({
      where: { mindmapId, role, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    if (taken) throw new BadRequestException(`Thuộc tính "${taken.name}" đang giữ vai trò "${ROLE_LABEL[role]}"`);
  }

  private async findOwnedDefinition(mindmapId: number, propId: number, userId: number) {
    await this.mindmaps.findOwned(mindmapId, userId);
    const def = await this.prisma.propertyDefinition.findFirst({ where: { id: propId, mindmapId } });
    if (!def) throw new NotFoundException('Không tìm thấy thuộc tính');
    return def;
  }
}
