import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handle, json, parseBody } from '@/lib/api';
import { findMatchingRule, loadActiveRules, normalizeText } from '@/lib/categorize';

const Body = z.object({
  content: z.string().max(1000),
  direction: z.enum(['IN', 'OUT']),
});

// Thử xem một nội dung chuyển khoản sẽ khớp quy tắc nào
export const POST = handle(async (req: Request) => {
  const { content, direction } = await parseBody(req, Body);
  const rule = findMatchingRule(await loadActiveRules(), content, direction);
  const category = rule
    ? await prisma.category.findUnique({
        where: { id: rule.categoryId },
        select: { id: true, name: true, icon: true, color: true, kind: true },
      })
    : null;
  return json({
    normalized: normalizeText(content),
    rule: rule ? { id: rule.id, pattern: rule.pattern, matchType: rule.matchType } : null,
    category,
  });
});
