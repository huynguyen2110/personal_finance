// Chạy một lần khi server Next.js khởi động.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startEmailPoller } = await import('./lib/email/poller');
  startEmailPoller();
}
