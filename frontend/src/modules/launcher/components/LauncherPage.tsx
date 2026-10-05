'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { APP_MODULES, type AppModule, type ModuleNavItem } from '@/config/modules';
import { getStoredUser } from '@/lib/auth-storage';
import { normalizeText } from '@/lib/text';
import UserMenu from '@/components/layout/UserMenu';
import ModuleIcon from './ModuleIcon';

interface SearchHit {
  key: string;
  href: string;
  title: string;
  module: AppModule;
  item?: ModuleNavItem;
}

// Mọi đích có thể tìm: bản thân module + từng trang trong menu của nó
const TARGETS: (SearchHit & { haystack: string })[] = APP_MODULES.flatMap((m) => [
  { key: m.id, href: m.home, title: m.name, module: m, haystack: normalizeText([m.name, m.description, ...(m.keywords ?? [])].join(' ')) },
  ...m.nav
    .flatMap((g) => g.items)
    .map((it) => ({
      key: `${m.id}:${it.href}`,
      href: it.href,
      title: it.label,
      module: m,
      item: it,
      haystack: normalizeText([it.label, m.name, ...(it.keywords ?? [])].join(' ')),
    })),
]);

// Trang chủ sau đăng nhập: chọn module để bắt đầu (tham khảo màn chào của ERP)
export default function LauncherPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi mount
    setName(getStoredUser()?.username ?? '');
  }, []);

  const hits = useMemo(() => {
    const words = normalizeText(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return TARGETS.filter((t) => words.every((w) => t.haystack.includes(w))).slice(0, 8);
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hits[0]) router.push(hits[0].href);
  }

  return (
    <div className="min-h-screen font-jakarta bg-[radial-gradient(1200px_600px_at_10%_-10%,#ccfbf1_0%,transparent_60%),radial-gradient(900px_500px_at_100%_0%,#ede9fe_0%,transparent_55%)] bg-slate-50">
      <header className="flex items-center justify-between gap-3 px-4 md:px-8 h-16">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-[17px] font-bold text-slate-900">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-700 to-violet-600 text-white inline-flex items-center justify-center" aria-hidden>
            <Sparkles size={18} />
          </span>
          {APP_NAME}
        </Link>
        <UserMenu />
      </header>

      <main className="px-4 md:px-8 pb-12 pt-6 md:pt-12">
        <section className="mx-auto max-w-4xl rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] px-5 py-8 md:px-14 md:py-12 flex flex-col gap-8">
          <h1 className="text-center text-[22px] md:text-[28px] leading-tight text-slate-700 tracking-[-0.01em]">
            Chào mừng tới {APP_NAME}
            {name && (
              <>
                , <b className="text-slate-900">{name}</b>
              </>
            )}
            !
          </h1>

          {/* Tìm module / trang */}
          <form onSubmit={submit} className="relative mx-auto w-full max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pl-4 shadow-sm focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-600/10">
              <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Thử tìm: giao dịch, ngân sách, todo…"
                aria-label="Tìm module hoặc trang"
                className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                autoFocus
              />
              <button type="submit" disabled={!hits.length} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-teal-500 px-4 md:px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <span className="hidden sm:inline">Tìm kiếm</span> <Sparkles className="w-4 h-4" aria-hidden />
              </button>
            </div>
            {q.trim() && (
              <ul className="absolute z-10 left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl" role="listbox" aria-label="Kết quả tìm kiếm">
                {hits.length ? (
                  hits.map((h) => {
                    const Icon = h.item?.icon ?? h.module.icon;
                    return (
                      <li key={h.key}>
                        <Link href={h.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                          <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${h.module.from}, ${h.module.to})` }} aria-hidden>
                            <Icon size={16} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 truncate">{h.title}</span>
                            <span className="block text-xs text-slate-500 truncate">{h.item ? h.module.name : 'Module'}</span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300" aria-hidden />
                        </Link>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-3 py-3 text-sm text-slate-500">Không tìm thấy module hay trang nào.</li>
                )}
              </ul>
            )}
          </form>

          {/* Lưới module */}
          <div className="flex flex-col gap-5">
            <p className="text-sm md:text-[15px] text-slate-600 text-center md:text-left">Bạn muốn bắt đầu công việc nào hôm nay?</p>
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-6">
              {APP_MODULES.map((m) => (
                <li key={m.id}>
                  <Link href={m.home} className="group flex flex-col items-center gap-2.5 rounded-2xl p-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-teal-600" title={m.description}>
                    <span className="transition-transform duration-200 group-hover:-translate-y-1">
                      <ModuleIcon module={m} />
                    </span>
                    <span className="text-[13px] md:text-sm font-medium text-slate-800 leading-snug">{m.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
