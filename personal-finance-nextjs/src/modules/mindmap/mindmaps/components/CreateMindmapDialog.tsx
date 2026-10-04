'use client';

import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Dialog } from '@/modules/mindmap/components/ui/Dialog';
import { Input } from '@/modules/mindmap/components/ui/Input';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { cn } from '@/modules/mindmap/lib/utils';
import { MindmapTemplateId } from '../api';
import { useCreateMindmap } from '../hooks';

const TEMPLATES: {
  id: MindmapTemplateId | null;
  label: string;
  description: string;
}[] = [
  { id: null, label: 'Trống', description: 'Tự vẽ và tự tạo thuộc tính' },
  {
    id: 'growth',
    label: 'Phát triển bản thân',
    description:
      'Tạo sẵn Ưu tiên, Độ khó, Thời gian (giờ), Chi phí (₫) cho trang Kế hoạch. Nhánh cấp 1 = lĩnh vực, cấp dưới = hành động.',
  },
];

export function CreateMindmapDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<MindmapTemplateId | null>(null);
  const create = useCreateMindmap();

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        template: template ?? undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setTemplate(null);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Tạo mindmap mới">
      <div className="space-y-4">
        <Input
          label="Tiêu đề"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="VD: Phát triển bản thân"
        />
        <Input
          label="Mô tả (tùy chọn)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Mẫu</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id ?? 'blank'}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition',
                  template === t.id
                    ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                    : 'border-gray-200 hover:border-violet-300',
                )}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
        {create.isError && (
          <p className="text-sm text-red-600">
            {extractErrorMessage(create.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={create.isPending || !title.trim()}>
            {create.isPending ? 'Đang tạo…' : 'Tạo'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
