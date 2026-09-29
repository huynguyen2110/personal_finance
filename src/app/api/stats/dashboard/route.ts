import { NextRequest } from 'next/server';
import { handle, json, HttpError } from '@/lib/api';
import { daysBetween, isValidDateStr } from '@/lib/dates';
import { getDashboard } from '@/lib/reports';

export const GET = handle(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  if (!isValidDateStr(from) || !isValidDateStr(to) || from > to) {
    throw new HttpError(400, 'Khoảng ngày không hợp lệ');
  }
  if (daysBetween(from, to) > 800) throw new HttpError(400, 'Khoảng ngày tối đa ~2 năm');
  const accountId = Number(sp.get('accountId')) || null;
  return json(await getDashboard({ from, to, accountId }));
});
