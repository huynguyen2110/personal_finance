'use client';

import {
  Check,
  ChevronRight,
  KeyRound,
  ListPlus,
  Lock,
  PenLine,
  Plus,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatCompactVND } from '@/lib/money';
import { LINK_KINDS, NodeLink } from '@/modules/mindmap/links/api';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { cn, formatMinutes, toDateKey } from '@/modules/mindmap/lib/utils';
import { useUpdateNode } from '@/modules/mindmap/mindmaps/hooks';
import { NodeStatus, STATUS_LABELS } from '@/modules/mindmap/mindmaps/types';
import { useNodeDetail } from '@/modules/mindmap/node-page/hooks';
import { PropertyDefinition } from '@/modules/mindmap/properties/api';
import {
  useCreateTodo,
  useNodeTodos,
  useUpdateTodo,
} from '@/modules/mindmap/todos/hooks';
import { roleMeta } from '../nodeMeta';
import { MindmapTree } from '../useMindmapTree';

/** Đoạn chữ đầu của trang ghi chú (TipTap JSON) để làm mô tả ngắn. */
function excerpt(doc: object | null | undefined, max = 180): string {
  const parts: string[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object' || parts.join(' ').length > max) return;
    const node = n as { text?: string; content?: unknown[] };
    if (typeof node.text === 'string') parts.push(node.text);
    node.content?.forEach(walk);
  };
  walk(doc);
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-[#eaedff] p-2.5">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      <span className={cn('mt-0.5 text-xl font-bold tracking-tight tabular-nums text-gray-900', tone)}>
        {value}
        {sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}
      </span>
    </div>
  );
}

function RefRow({
  icon,
  title,
  hint,
  hintClass,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  hintClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-xl bg-white p-2 text-left shadow-sm transition hover:shadow"
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-gray-900">{title}</span>
          <span className={cn('truncate text-[11px] font-semibold', hintClass)}>{hint}</span>
        </span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-gray-400" />
    </button>
  );
}

export function MapInspector({
  mindmapId,
  nodeId,
  tree,
  definitions,
  links,
  onSelect,
  onClose,
}: {
  mindmapId: number;
  nodeId: number | null;
  tree: MindmapTree;
  definitions: PropertyDefinition[] | undefined;
  links: NodeLink[];
  onSelect: (nodeId: number) => void;
  onClose: () => void;
}) {
  const node = nodeId !== null ? tree.byId.get(nodeId) : undefined;

  return (
    <aside className="z-20 flex h-full w-80 shrink-0 flex-col bg-white shadow-[-4px_0_24px_rgba(15,23,42,0.04)]">
      <div className="flex shrink-0 items-center justify-between bg-[#f2f3ff]/60 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <SlidersHorizontal size={17} className="text-violet-600" />
          <span className="truncate text-[17px] font-semibold tracking-tight text-gray-900">
            {node && node.parentId !== null ? 'Chi tiết nhánh' : 'Tổng quan'}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#eaedff] hover:text-gray-900"
        >
          <X size={17} />
        </button>
      </div>

      {node && node.parentId !== null ? (
        <NodeDetails
          key={node.id}
          mindmapId={mindmapId}
          nodeId={node.id}
          tree={tree}
          definitions={definitions}
          links={links}
          onSelect={onSelect}
        />
      ) : (
        <Overview tree={tree} definitions={definitions} onSelect={onSelect} />
      )}
    </aside>
  );
}

/** Không chọn nhánh (hoặc chọn nút gốc): danh sách lĩnh vực + tiến độ. */
function Overview({
  tree,
  definitions,
  onSelect,
}: {
  tree: MindmapTree;
  definitions: PropertyDefinition[] | undefined;
  onSelect: (nodeId: number) => void;
}) {
  const areas = tree.root ? (tree.childrenOf.get(tree.root.id) ?? []) : [];
  const total = tree.root ? tree.rollup.get(tree.root.id) : undefined;
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div className="rounded-2xl bg-[#f2f3ff] p-3">
        <p className="text-sm text-gray-600">
          Chọn một nhánh trên sơ đồ để xem độ khó, thời gian, liên kết mở khóa và
          các todo liên quan.
        </p>
        {total && total.total > 0 && (
          <p className="mt-2 text-xs font-semibold text-violet-700">
            Tổng tiến độ: {total.done}/{total.total} việc (
            {Math.round((total.done / total.total) * 100)}%)
          </p>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900">Lĩnh vực</span>
      {areas.length === 0 ? (
        <p className="text-sm text-gray-400">
          Chọn nút gốc rồi bấm <b>Tab</b> để thêm lĩnh vực đầu tiên.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {areas.map((a) => {
            const r = tree.rollup.get(a.id) ?? { done: 0, total: 0 };
            const priority = roleMeta(a.propertyValues, definitions).priority;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-left shadow-sm transition hover:shadow"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tree.colorOf.get(a.id) }}
                  />
                  <span className="truncate text-sm font-semibold text-gray-900">{a.title}</span>
                  {priority && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${priority.color}1f`, color: priority.color }}
                    >
                      {priority.label}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-500">
                  {r.done}/{r.total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NodeDetails({
  mindmapId,
  nodeId,
  tree,
  definitions,
  links,
  onSelect,
}: {
  mindmapId: number;
  nodeId: number;
  tree: MindmapTree;
  definitions: PropertyDefinition[] | undefined;
  links: NodeLink[];
  onSelect: (nodeId: number) => void;
}) {
  const node = tree.byId.get(nodeId)!;
  const { data: detail } = useNodeDetail(mindmapId, nodeId);
  const { data: todos } = useNodeTodos(nodeId);
  const updateNode = useUpdateNode(mindmapId);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const [adding, setAdding] = useState(false);
  const [todoTitle, setTodoTitle] = useState('');
  const [addedToday, setAddedToday] = useState(false);

  const meta = roleMeta(node.propertyValues, definitions);
  // Lĩnh vực chứa nhánh (chính nó nếu là nhánh cấp 1)
  let area = node;
  while (area.parentId !== null && area.parentId !== tree.root?.id) {
    const parent = tree.byId.get(area.parentId);
    if (!parent) break;
    area = parent;
  }
  const isArea = node.parentId === tree.root?.id;
  // Hành động chưa chọn ưu tiên → dùng ưu tiên của lĩnh vực (giống cách chấm điểm ở trang Kế hoạch)
  const areaPriority = isArea ? null : roleMeta(area.propertyValues, definitions).priority;
  const priority = meta.priority ?? areaPriority;
  const color = tree.colorOf.get(node.id) ?? '#7c3aed';
  const rollup = tree.rollup.get(node.id) ?? { done: 0, total: 0 };
  const percent = rollup.total ? Math.round((rollup.done / rollup.total) * 100) : 0;
  const minutes = (todos ?? []).reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const description = excerpt(detail?.pageContent);

  const titleOf = (id: number) => tree.byId.get(id)?.title ?? `#${id}`;
  const isDone = (id: number) => tree.byId.get(id)?.status === 'done';
  const unlocks = links.filter(
    (l) => l.kind === 'prerequisite' && l.sourceNodeId === nodeId && !isDone(l.targetNodeId),
  );
  const blockedBy = links.filter(
    (l) => l.kind === 'prerequisite' && l.targetNodeId === nodeId && !isDone(l.sourceNodeId),
  );
  const supports = links.filter((l) => l.kind === 'supports' && l.sourceNodeId === nodeId);
  const others = links.filter(
    (l) =>
      (l.kind === 'related' && (l.sourceNodeId === nodeId || l.targetNodeId === nodeId)) ||
      (l.kind === 'supports' && l.targetNodeId === nodeId),
  );

  const addTodo = (title: string, onDone?: () => void) =>
    createTodo.mutate(
      { title, date: toDateKey(new Date()), nodeIds: [nodeId] },
      { onSuccess: onDone },
    );

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      {/* Tiêu đề + lĩnh vực + độ khó */}
      <div className="flex flex-col gap-1 rounded-2xl bg-[#f2f3ff] p-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: tree.colorOf.get(area.id) ?? color }}
          >
            {isArea ? 'Lĩnh vực' : area.title}
          </span>
          {meta.difficulty && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: `${meta.difficulty.color}1f`, color: meta.difficulty.color }}
            >
              Độ khó: {meta.difficulty.label}
            </span>
          )}
        </div>
        <h2 className="mt-1 text-lg leading-snug font-semibold tracking-tight text-gray-900">
          {node.title}
        </h2>
        <p className="text-[13px] leading-[18px] text-gray-500">
          {description || 'Chưa có ghi chú — mở trang của nhánh để viết mục tiêu, tài liệu, cách làm.'}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {([null, 'todo', 'doing', 'done'] as const).map((s) => (
            <button
              key={s ?? 'none'}
              type="button"
              onClick={() => updateNode.mutate({ nodeId, status: s as NodeStatus | null })}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold transition',
                node.status === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900',
              )}
            >
              {s ? STATUS_LABELS[s] : 'Chưa đặt'}
            </button>
          ))}
        </div>
      </div>

      {/* Số liệu */}
      <div className="grid grid-cols-2 gap-1.5">
        <Metric
          label="Thời gian đã bỏ ra"
          value={minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10}h` : `${minutes}p`}
          sub={meta.hours !== null ? `/ ${meta.hours}h` : undefined}
        />
        <Metric
          label="Tiến độ todo"
          value={rollup.total ? `${percent}%` : '—'}
          sub={rollup.total ? `(${rollup.done}/${rollup.total})` : undefined}
          tone="text-teal-700"
        />
        <Metric
          label="Ưu tiên"
          value={
            priority ? (
              <span style={{ color: priority.color }}>{priority.label}</span>
            ) : (
              '—'
            )
          }
          sub={!meta.priority && priority ? '(lĩnh vực)' : undefined}
        />
        <Metric
          label="Chi phí"
          value={meta.cost === null ? '—' : meta.cost === 0 ? '0 đ' : `${formatCompactVND(meta.cost)}đ`}
        />
      </div>

      {/* Mắt xích: mở khóa / bị chặn / bổ trợ */}
      {(unlocks.length > 0 || blockedBy.length > 0 || supports.length > 0 || others.length > 0) && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#f5f3ff] p-3">
          <span className="flex items-center gap-1.5 font-semibold text-violet-700">
            <KeyRound size={17} /> Mắt xích quan trọng
          </span>
          {blockedBy.length > 0 && (
            <>
              <p className="text-[13px] text-gray-600">
                Đang <b className="text-red-600">bị chặn</b> — cần xong trước:
              </p>
              {blockedBy.map((l) => (
                <RefRow
                  key={l.id}
                  icon={<Lock size={17} className="shrink-0 text-red-500" />}
                  title={titleOf(l.sourceNodeId)}
                  hint="Điều kiện trước chưa xong"
                  hintClass="text-red-500"
                  onClick={() => onSelect(l.sourceNodeId)}
                />
              ))}
            </>
          )}
          {unlocks.length > 0 && (
            <>
              <p className="text-[13px] text-gray-600">
                Hoàn thành nhánh này sẽ <b className="text-violet-700">mở khóa {unlocks.length} việc</b>:
              </p>
              {unlocks.map((l) => (
                <RefRow
                  key={l.id}
                  icon={<Lock size={17} className="shrink-0 text-violet-600" />}
                  title={titleOf(l.targetNodeId)}
                  hint="Đang chờ nhánh này"
                  hintClass="text-red-500"
                  onClick={() => onSelect(l.targetNodeId)}
                />
              ))}
            </>
          )}
          {supports.length > 0 && (
            <>
              <p className="text-[13px] text-gray-600">Bổ trợ cho:</p>
              {supports.map((l) => (
                <RefRow
                  key={l.id}
                  icon={<Share2 size={17} className="shrink-0 text-teal-600" />}
                  title={titleOf(l.targetNodeId)}
                  hint={l.note || LINK_KINDS.supports.description}
                  hintClass="text-teal-700"
                  onClick={() => onSelect(l.targetNodeId)}
                />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="text-[13px] text-gray-600">Liên quan / được bổ trợ bởi:</p>
              {others.map((l) => {
                const other = l.sourceNodeId === nodeId ? l.targetNodeId : l.sourceNodeId;
                return (
                  <RefRow
                    key={l.id}
                    icon={<Share2 size={17} className="shrink-0 text-gray-400" />}
                    title={titleOf(other)}
                    hint={l.note || LINK_KINDS[l.kind].label}
                    hintClass="text-gray-500"
                    onClick={() => onSelect(other)}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Todo liên kết */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">Todo hằng ngày liên kết</span>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-violet-700 hover:underline"
          >
            <Plus size={12} /> Gắn todo
          </button>
        </div>
        {adding && (
          <input
            autoFocus
            value={todoTitle}
            onChange={(e) => setTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && todoTitle.trim()) {
                addTodo(todoTitle.trim(), () => {
                  setTodoTitle('');
                  setAdding(false);
                });
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="Việc hôm nay… (Enter để thêm)"
            className="rounded-xl bg-[#f2f3ff] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
          />
        )}
        {!todos?.length ? (
          <p className="text-[13px] text-gray-400">Chưa có todo nào gắn với nhánh này.</p>
        ) : (
          todos.slice(0, 6).map((t) => (
            <div
              key={t.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl p-2.5 transition',
                t.completed ? 'bg-[#f2f3ff]' : 'bg-white shadow-sm hover:shadow',
              )}
            >
              <label className="flex min-w-0 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={(e) => updateTodo.mutate({ id: t.id, completed: e.target.checked })}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                    t.completed ? 'bg-violet-600 text-white' : 'bg-[#e2e7ff]',
                  )}
                >
                  {t.completed && <Check size={13} />}
                </span>
                <span
                  className={cn(
                    'truncate text-[13px] text-gray-800',
                    t.completed && 'line-through opacity-70',
                  )}
                  title={`${t.title} — ${t.date}`}
                >
                  {t.title}
                </span>
              </label>
              <span
                className={cn(
                  'shrink-0 text-[11px] font-semibold',
                  t.completed ? 'text-teal-700' : 'text-gray-500',
                )}
              >
                {t.durationMinutes !== null ? `${t.durationMinutes}p` : t.date.slice(5).split('-').reverse().join('/')}
              </span>
            </div>
          ))
        )}
        {minutes > 0 && (
          <p className="text-[11px] text-gray-400">Tổng thời gian ghi nhận: {formatMinutes(minutes)}</p>
        )}
      </div>

      {/* Thao tác nhanh */}
      <div className="mt-auto flex flex-col gap-1.5 pt-2">
        <button
          type="button"
          disabled={createTodo.isPending || addedToday || node.status === 'done'}
          onClick={() => addTodo(node.title, () => setAddedToday(true))}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 py-2.5 font-semibold text-white shadow-[0_2px_8px_rgba(99,14,212,0.25)] transition hover:opacity-95 disabled:opacity-60"
        >
          {addedToday ? <Check size={18} /> : <ListPlus size={18} />}
          {addedToday ? 'Đã thêm vào todo hôm nay' : 'Làm ngay hôm nay'}
        </button>
        <Link
          href={growthRoutes.node(nodeId)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f2f3ff] px-3 py-2 font-semibold text-gray-900 transition hover:bg-[#eaedff]"
        >
          <PenLine size={17} /> Chỉnh sửa nhánh &amp; ghi chú
        </Link>
      </div>
    </div>
  );
}
