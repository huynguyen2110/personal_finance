'use client';

import { useActionState } from 'react';
import { Wallet, Lock, User, LogIn, CircleAlert } from 'lucide-react';
import { login, type LoginState } from './actions';

export default function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState<LoginState | undefined, FormData>(
    login,
    undefined
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mb-4">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-text font-heading">Chi tiêu cá nhân</h1>
          <p className="text-sm text-text-secondary mt-1">Đăng nhập để tiếp tục</p>
        </div>

        <div className="glass-card p-6">
          <form action={action} className="space-y-4">
            {from && <input type="hidden" name="from" value={from} />}
            {state?.error && (
              <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/20 px-3 py-2.5 text-sm text-danger">
                <CircleAlert className="w-4 h-4 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="admin"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
