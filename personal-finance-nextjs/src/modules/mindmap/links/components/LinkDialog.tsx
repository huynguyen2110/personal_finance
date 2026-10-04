'use client';

import { ArrowLeftRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Dialog } from '@/modules/mindmap/components/ui/Dialog';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { cn } from '@/modules/mindmap/lib/utils';
import { LINK_KINDS, LinkKind, NodeLink } from '../api';
import { useCreateLink, useDeleteLink, useUpdateLink } from '../hooks';

export type LinkDialogTarget =
  | { mode: 'create'; sourceId: number; targetId: number }
  | { mode: 'edit'; link: NodeLink };

/** Tạo hoặc sửa một liên kết giữa hai nhánh (loại + ghi chú). */
export function LinkDialog({
  mindmapId,
  target,
  titleOf,
  onClose,
}: {
  mindmapId: number;
  target: LinkDialogTarget | null;
  titleOf: (nodeId: number) => string;
  onClose: () => void;
}) {
  if (!target) return null;
  // key: mở lại với liên kết khác → state mới
  const key =
    target.mode === 'edit'
      ? `e${target.link.id}`
      : `c${target.sourceId}-${target.targetId}`;
  return (
    <LinkDialogBody
      key={key}
      mindmapId={mindmapId}
      target={target}
      titleOf={titleOf}
      onClose={onClose}
    />
  );
}

function LinkDialogBody({
  mindmapId,
  target,
  titleOf,
  onClose,
}: {
  mindmapId: number;
  target: LinkDialogTarget;
  titleOf: (nodeId: number) => string;
  onClose: () => void;
}) {
  const editing = target.mode === 'edit' ? target.link : null;
  const [ends, setEnds] = useState(() =>
    editing
      ? { source: editing.sourceNodeId, target: editing.targetNodeId }
      : target.mode === 'create'
        ? { source: target.sourceId, target: target.targetId }
        : { source: 0, target: 0 },
  );
  const [kind, setKind] = useState<LinkKind>(editing?.kind ?? 'supports');
  const [note, setNote] = useState(editing?.note ?? '');

  const create = useCreateLink(mindmapId);
  const update = useUpdateLink(mindmapId);
  const remove = useDeleteLink(mindmapId);
  const error = create.error ?? update.error ?? remove.error;
  const pending = create.isPending || update.isPending || remove.isPending;

  const submit = () => {
    const body = { kind, note: note.trim() || null };
    if (editing) {
      update.mutate({ linkId: editing.id, ...body }, { onSuccess: onClose });
    } else {
      create.mutate(
        { sourceNodeId: ends.source, targetNodeId: ends.target, ...body },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Sửa liên kết' : 'Nối hai nhánh'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">
            {titleOf(ends.source)}
          </span>
          {editing ? (
            <span className="text-gray-400">→</span>
          ) : (
            <button
              type="button"
              onClick={() => setEnds({ source: ends.target, target: ends.source })}
              title="Đổi chiều"
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <ArrowLeftRight size={14} />
            </button>
          )}
          <span className="min-w-0 flex-1 truncate text-right font-medium">
            {titleOf(ends.target)}
          </span>
        </div>

        <div className="space-y-1.5">
          {(Object.keys(LINK_KINDS) as LinkKind[]).map((k) => {
            const meta = LINK_KINDS[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition',
                  kind === k
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 hover:border-violet-300',
                )}
              >
                <svg width="28" height="12" className="mt-1 shrink-0">
                  <line
                    x1="1"
                    y1="6"
                    x2={meta.arrow ? 21 : 27}
                    y2="6"
                    stroke={meta.color}
                    strokeWidth="2"
                    strokeDasharray={meta.dash}
                  />
                  {meta.arrow && (
                    <path d="M20 1 L27 6 L20 11 Z" fill={meta.color} />
                  )}
                </svg>
                <span>
                  <span className="block text-sm font-medium">
                    {meta.label}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {meta.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Ghi chú (tùy chọn)
          </label>
          <input
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="VD: đọc tài liệu tiếng Anh nhanh hơn"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{extractErrorMessage(error)}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          {editing ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              disabled={pending}
              onClick={() =>
                remove.mutate(editing.id, { onSuccess: onClose })
              }
            >
              <Trash2 size={13} /> Xóa liên kết
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={submit} disabled={pending}>
              {editing ? 'Lưu' : 'Nối'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
