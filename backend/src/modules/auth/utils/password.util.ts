import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

// Hash mật khẩu bằng scrypt. Kết quả có dạng "salt:hash" (đều ở dạng hex).
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

// So khớp mật khẩu với chuỗi hash đã lưu. So sánh an toàn với thời gian cố định.
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== derived.length) return false;

  return timingSafeEqual(hashBuffer, derived);
}
