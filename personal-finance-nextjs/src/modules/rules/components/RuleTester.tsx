'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical } from 'lucide-react';
import CategoryIcon from '@/components/shared/CategoryIcon';
import { errorMessage } from '@/lib/api-client';
import type { Direction } from '@/types/common';
import { testRule } from '../lib';
import type { RuleTestResult } from '../types';

export default function RuleTester() {
  const [content, setContent] = useState('');
  const [direction, setDirection] = useState<Direction>('OUT');
  const [result, setResult] = useState<RuleTestResult | null>(null);

  async function test(e: React.FormEvent) {
    e.preventDefault();
    try {
      setResult(await testRule({ content, direction }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <section className="glass-card p-4">
      <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-text-muted" /> Thử quy tắc
      </h2>
      <form onSubmit={test} className="space-y-2">
        <input
          className="input-field"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dán nội dung chuyển khoản…"
          aria-label="Nội dung chuyển khoản"
        />
        <div className="flex gap-2">
          <select className="select-field" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} aria-label="Loại">
            <option value="OUT">Tiền ra (chi)</option>
            <option value="IN">Tiền vào (thu)</option>
          </select>
          <button type="submit" className="btn-secondary !py-2 text-sm whitespace-nowrap">Kiểm tra</button>
        </div>
      </form>
      {result && (
        <div className="mt-3 rounded-xl bg-surface-light p-3 text-sm space-y-1">
          <p className="text-xs text-text-muted break-words">Chuẩn hóa: {result.normalized || '(trống)'}</p>
          {result.category ? (
            <p className="flex items-center gap-2 text-text">
              <CategoryIcon icon={result.category.icon} color={result.category.color} size="sm" />
              {result.category.name}
              <span className="text-xs text-text-muted">— khớp “{result.rule?.pattern}”</span>
            </p>
          ) : (
            <p className="text-text-secondary">Không khớp quy tắc nào → Chưa phân loại</p>
          )}
        </div>
      )}
    </section>
  );
}
