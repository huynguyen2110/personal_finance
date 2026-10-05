'use client';

import { Network } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/modules/mindmap/components/ui/EmptyState';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { addDays, formatDateVi, startOfWeek, toDateKey } from '@/modules/mindmap/lib/utils';
import { Todo } from '../api';
import { useStreak, useTodosOfDays } from '../hooks';
import { GrowthLookup, useGrowthLookup } from '../lookup';
import { FocusTimer } from './FocusTimer';
import { PeriodMode, PeriodNav } from './PeriodNav';
import { SmartTodoForm } from './SmartTodoForm';
import { TodayImpact } from './TodayImpact';
import { TodoCard } from './TodoCard';
import { TodoHero } from './TodoHero';

/** Chưa xong trước; trong đó điểm đòn bẩy cao trước, rồi theo thứ tự tạo. */
function sortTodos(todos: Todo[], lookup: GrowthLookup) {
  return [...todos].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      lookup.scoreOf(b) - lookup.scoreOf(a) ||
      a.orderIndex - b.orderIndex ||
      a.id - b.id,
  );
}

export function TodosView({ mindmapId }: { mindmapId: number }) {
  const today = toDateKey(new Date());
  const [mode, setMode] = useState<PeriodMode>('day');
  const [dateKey, setDateKey] = useState(today);
  const weekStart = startOfWeek(dateKey);
  const dateKeys = useMemo(
    () => (mode === 'day' ? [dateKey] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))),
    [mode, dateKey, weekStart],
  );

  const { byDate, isLoading } = useTodosOfDays(dateKeys);
  const lookup = useGrowthLookup(mindmapId);
  const { data: streak } = useStreak();
  const all = byDate.flatMap((d) => d.todos);

  // Việc đang gắn với đồng hồ Focus (giữ bản mới nhất từ danh sách để cộng phút cho đúng)
  const [focus, setFocus] = useState<{ todo: Todo; token: number } | null>(null);
  const focusTodo = focus ? (all.find((t) => t.id === focus.todo.id) ?? focus.todo) : null;
  const startFocus = (todo: Todo) => setFocus((f) => ({ todo, token: (f?.token ?? 0) + 1 }));

  const periodLabel =
    mode === 'day'
      ? dateKey === today
        ? 'Hôm nay'
        : 'Ngày này'
      : today >= weekStart && today <= addDays(weekStart, 6)
        ? 'Tuần này'
        : 'Tuần này đã chọn';
  // Ngày thêm việc: ngày đang xem; chế độ tuần → hôm nay nếu thuộc tuần, không thì thứ hai
  const formDate = mode === 'day' ? dateKey : dateKeys.includes(today) ? today : weekStart;

  const card = (todo: Todo) => (
    <TodoCard
      key={todo.id}
      todo={todo}
      lookup={lookup}
      focused={focusTodo?.id === todo.id}
      onFocus={startFocus}
    />
  );

  return (
    <div className="page-in mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            <Network size={15} className="text-violet-700" />
            <span>Phát triển bản thân</span>
            <span>•</span>
            <span className="text-violet-700">Hành động mỗi ngày</span>
          </div>
          <h1 className="text-[28px] leading-9 font-bold tracking-tight text-gray-900">Todo hằng ngày</h1>
          <p className="text-sm text-gray-500">
            Hành động nhỏ tạo nên bước tiến lớn • Mỗi việc gắn với một nhánh trên bản đồ năng lực
          </p>
        </div>
        <PeriodNav
          mode={mode}
          dateKey={dateKey}
          weekStart={weekStart}
          onModeChange={setMode}
          onDateChange={setDateKey}
        />
      </div>

      <TodoHero todos={all} lookup={lookup} streak={streak} periodLabel={periodLabel} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <SmartTodoForm dateKey={formDate} lookup={lookup} />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">Danh sách việc thực thi</span>
                <span className="rounded-full bg-[#e2e7ff] px-1.5 py-0.5 text-[11px] font-bold text-gray-600">
                  {all.length} việc
                </span>
              </div>
              <span className="text-[11px] font-semibold text-gray-500">
                Sắp xếp: <span className="text-violet-700">điểm đòn bẩy cao nhất</span>
              </span>
            </div>

            {isLoading ? (
              <Spinner />
            ) : all.length === 0 ? (
              <EmptyState
                title={mode === 'day' ? 'Chưa có việc cho ngày này' : 'Tuần này chưa có việc nào'}
                description="Thêm việc ở trên và gắn với hành động trên bản đồ để biết mỗi ngày bạn đầu tư vào đâu."
              />
            ) : mode === 'day' ? (
              sortTodos(all, lookup).map(card)
            ) : (
              byDate
                .filter((d) => d.todos.length > 0)
                .map((d) => (
                  <div key={d.dateKey} className="flex flex-col gap-2">
                    <span className="px-1 pt-1 text-xs font-semibold text-gray-500">
                      {formatDateVi(d.dateKey)}
                      {d.dateKey === today && <span className="ml-1.5 text-violet-700">• Hôm nay</span>}
                      <span className="ml-1.5 text-gray-400">
                        {d.todos.filter((t) => t.completed).length}/{d.todos.length}
                      </span>
                    </span>
                    {sortTodos(d.todos, lookup).map(card)}
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <FocusTimer target={focusTodo} startToken={focus?.token ?? 0} />
          <TodayImpact todos={all} lookup={lookup} dateKey={formDate} periodLabel={periodLabel} />
        </div>
      </div>
    </div>
  );
}
