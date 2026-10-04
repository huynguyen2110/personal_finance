'use client';

import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { LINK_KINDS, LinkKind } from '@/modules/mindmap/links/api';
import {
  useCreateLink,
  useDeleteLink,
  useLinks,
} from '@/modules/mindmap/links/hooks';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { growthRoutes } from '@/modules/mindmap/lib/routes';
import { useNodes } from '@/modules/mindmap/mindmaps/hooks';
import { TreeNode } from '@/modules/mindmap/mindmaps/types';

const selectClass =
  'rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-violet-500';

/** Các nhánh theo thứ tự cây, kèm độ sâu để thụt lề trong ô chọn. */
function flattenTree(nodes: TreeNode[]): { node: TreeNode; depth: number }[] {
  const childrenOf = new Map<number | null, TreeNode[]>();
  for (const n of nodes) {
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n);
    childrenOf.set(n.parentId, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
  }
  const out: { node: TreeNode; depth: number }[] = [];
  const visit = (parentId: number | null, depth: number) => {
    for (const n of childrenOf.get(parentId) ?? []) {
      out.push({ node: n, depth });
      visit(n.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

export function LinksSection({
  mindmapId,
  nodeId,
}: {
  mindmapId: number;
  nodeId: number;
}) {
  const { data: nodes } = useNodes(mindmapId);
  const { data: links } = useLinks(mindmapId);
  const create = useCreateLink(mindmapId);
  const remove = useDeleteLink(mindmapId);

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<LinkKind>('supports');
  // out: nhánh này → nhánh kia; in: nhánh kia → nhánh này
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const [otherId, setOtherId] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const titleOf = useMemo(() => {
    const map = new Map((nodes ?? []).map((n) => [n.id, n.title]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [nodes]);
  const options = useMemo(
    () => flattenTree(nodes ?? []).filter((o) => o.node.id !== nodeId),
    [nodes, nodeId],
  );

  const mine = (links ?? []).filter(
    (l) => l.sourceNodeId === nodeId || l.targetNodeId === nodeId,
  );

  const submit = () => {
    if (otherId === '') return;
    create.mutate(
      {
        sourceNodeId: direction === 'out' ? nodeId : otherId,
        targetNodeId: direction === 'out' ? otherId : nodeId,
        kind,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setOtherId('');
          setNote('');
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Liên kết</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            <Plus size={13} /> Thêm
          </button>
        )}
      </div>

      {mine.length === 0 && !adding && (
        <p className="text-sm text-gray-400">
          Chưa có liên kết. Nối nhánh này với hành động nó bổ trợ, hoặc với
          việc cần xong trước.
        </p>
      )}

      {mine.length > 0 && (
        <ul className="space-y-1.5">
          {mine.map((l) => {
            const meta = LINK_KINDS[l.kind];
            const outgoing = l.sourceNodeId === nodeId;
            const otherNode = outgoing ? l.targetNodeId : l.sourceNodeId;
            return (
              <li key={l.id} className="group flex items-center gap-2 text-sm">
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                >
                  {outgoing ? meta.outPhrase : meta.inPhrase}
                </span>
                <Link
                  href={growthRoutes.node(otherNode)}
                  className="min-w-0 truncate font-medium hover:text-violet-700 hover:underline"
                >
                  {titleOf(otherNode)}
                </Link>
                {l.note && (
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
                    — {l.note}
                  </span>
                )}
                <button
                  onClick={() => remove.mutate(l.id)}
                  className="ml-auto rounded p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                  title="Xóa liên kết"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="mt-3 space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">Nhánh này</span>
            <select
              value={`${direction}:${kind}`}
              onChange={(e) => {
                const [d, k] = e.target.value.split(':');
                setDirection(d as 'out' | 'in');
                setKind(k as LinkKind);
              }}
              className={selectClass}
            >
              {(Object.keys(LINK_KINDS) as LinkKind[]).flatMap((k) => {
                const meta = LINK_KINDS[k];
                const both = [
                  <option key={`out:${k}`} value={`out:${k}`}>
                    {meta.outPhrase.toLowerCase()}
                  </option>,
                ];
                if (meta.inPhrase !== meta.outPhrase) {
                  both.push(
                    <option key={`in:${k}`} value={`in:${k}`}>
                      {meta.inPhrase.toLowerCase()}
                    </option>,
                  );
                }
                return both;
              })}
            </select>
            <select
              value={otherId}
              onChange={(e) =>
                setOtherId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`${selectClass} min-w-0 flex-1`}
            >
              <option value="">— Chọn nhánh —</option>
              {options.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {`${'  '.repeat(depth)}${node.title}`}
                </option>
              ))}
            </select>
          </div>
          <input
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Ghi chú (tùy chọn)"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          {create.isError && (
            <p className="text-sm text-red-600">
              {extractErrorMessage(create.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={otherId === '' || create.isPending}
            >
              Nối
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
