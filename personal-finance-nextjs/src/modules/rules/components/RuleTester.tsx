'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, CircleCheck, CircleDashed, FlaskConical, X, Zap } from 'lucide-react';
import CategoryIcon from '@/components/shared/CategoryIcon';
import TreeSelect from '@/components/shared/TreeSelect';
import { errorMessage } from '@/lib/api-client';
import type { Direction } from '@/types/common';
import { testRule } from '../lib';
import type { RuleDTO, RuleTestResult } from '../types';

interface Props {
  rules?: RuleDTO[];
  // Nội dung được "mồi" từ bên ngoài (VD bấm nút Thử ở một quy tắc). Cha đổi `key` để nạp lại.
  initial?: { content: string; direction: Direction } | null;
}

// Hộp cát kiểm tra: dán nội dung chuyển khoản → xem quy tắc nào khớp
export default function RuleTester({ rules = [], initial }: Props) {
  const [content, setContent] = useState(initial?.content ?? '');
  const [direction, setDirection] = useState<Direction>(initial?.direction ?? 'OUT');
  const [result, setResult] = useState<RuleTestResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Có nội dung mồi → tự kiểm tra ngay
  useEffect(() => {
    if (!initial?.content) return;
    let cancelled = false;
    testRule({ content: initial.content, direction: initial.direction })
      .then((r) => !cancelled && setResult(r))
      .catch((e) => toast.error(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [initial]);

  async function test(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return toast.error('Nhập nội dung cần kiểm tra');
    setBusy(true);
    try {
      setResult(await testRule({ content, direction }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const matchedRule = result?.rule ? rules.find((r) => r.id === result.rule!.id) : undefined;

  return (
    <section className="fin-card p-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          <FlaskConical className="w-4 h-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-jakarta text-[15px] font-semibold text-slate-900 leading-tight">Kiểm tra thử quy tắc</h2>
          <p className="text-xs text-slate-500">Dán nội dung chuyển khoản bất kỳ để xem bộ lọc gán vào đâu</p>
        </div>
      </div>

      <form onSubmit={test} className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="fin-label">Nội dung sao kê / SMS</span>
          <span className="relative">
            <input
              className="input-field !pr-9 !rounded-lg !bg-slate-50 focus:!bg-white"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="VD: MBVCB.123 GRAB*TRIP 45000…"
            />
            {content && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
                onClick={() => {
                  setContent('');
                  setResult(null);
                }}
                aria-label="Xóa nội dung"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="fin-label">Loại giao dịch</span>
            <TreeSelect<Direction>
              ariaLabel="Loại giao dịch"
              className="!rounded-lg !bg-slate-50 hover:!bg-white"
              options={[
                { value: 'OUT', label: 'Tiền ra (Chi tiêu)', icon: <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-orange-50 text-expense" aria-hidden><ArrowUpRight className="w-3.5 h-3.5" /></span> },
                { value: 'IN', label: 'Tiền vào (Thu nhập)', icon: <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-blue-50 text-income" aria-hidden><ArrowDownLeft className="w-3.5 h-3.5" /></span> },
              ]}
              value={direction}
              onChange={(v) => v && setDirection(v)}
            />
          </label>
          <div className="flex flex-col justify-end">
            <button type="submit" disabled={busy} className="fin-btn fin-btn-primary w-full justify-center">
              <Zap className="w-4 h-4" aria-hidden /> {busy ? 'Đang kiểm tra…' : 'Kiểm tra'}
            </button>
          </div>
        </div>
      </form>

      {result &&
        (result.category ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex flex-col gap-2.5" role="status">
            <div className="flex items-center justify-between gap-2">
              <span className="fin-label !text-emerald-700 inline-flex items-center gap-1">
                <CircleCheck className="w-3.5 h-3.5" aria-hidden /> Khớp thành công
              </span>
              {matchedRule && (
                <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-800 text-[11px] font-semibold fin-num">
                  Ưu tiên {matchedRule.priority}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <CategoryIcon icon={result.category.icon} color={result.category.color} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{result.category.name}</p>
                <p className="text-xs text-slate-600 truncate">
                  Khớp mẫu{' '}
                  <code className="font-mono text-teal-800 font-semibold">
                    {result.rule?.matchType === 'REGEX' ? `/${result.rule.pattern}/i` : result.rule?.pattern}
                  </code>
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 break-words">
              Chuẩn hóa: <span className="font-mono">{result.normalized || '(trống)'}</span>
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex flex-col gap-1.5" role="status">
            <span className="fin-label !text-amber-800 inline-flex items-center gap-1">
              <CircleDashed className="w-3.5 h-3.5" aria-hidden /> Không khớp quy tắc nào
            </span>
            <p className="text-sm text-slate-800">Giao dịch này sẽ về &ldquo;Chưa phân loại&rdquo;.</p>
            <p className="text-[11px] text-slate-500 break-words">
              Chuẩn hóa: <span className="font-mono">{result.normalized || '(trống)'}</span>
            </p>
          </div>
        ))}
    </section>
  );
}
