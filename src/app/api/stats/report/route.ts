import { NextRequest } from 'next/server';
import { handle, json } from '@/lib/api';
import { getReport, parseReportScope } from '@/lib/reports';

export const GET = handle(async (req: NextRequest) => {
  return json(await getReport(parseReportScope(req.nextUrl.searchParams)));
});
