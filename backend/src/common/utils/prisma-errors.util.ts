import { Prisma } from '@prisma/client';

// Vi phạm ràng buộc unique (VD hai giao dịch giống nhau tới cùng lúc)
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}
