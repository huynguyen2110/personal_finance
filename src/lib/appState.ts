import prisma from './prisma';

export async function getAppState<T>(key: string): Promise<T | null> {
  const row = await prisma.appState.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function setAppState(key: string, value: unknown): Promise<void> {
  const v = JSON.stringify(value);
  await prisma.appState.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
}
