import axios from 'axios';

// URL của API NestJS (personal-finance-nestjs)
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Instance axios dùng chung. Gắn token / refresh / bóc envelope nằm ở api-client.ts.
const api = axios.create({ baseURL: API_URL });

export default api;
