import { z } from 'zod';
import { handle, json, parseBody } from '@/lib/api';
import { reapplyRules } from '@/lib/categorize';

const Body = z.object({ includeRuleCategorized: z.boolean().default(false) });

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, Body);
  const changed = await reapplyRules(body);
  return json({ changed });
});
