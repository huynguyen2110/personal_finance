'use client';

import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Dialog } from '@/modules/mindmap/components/ui/Dialog';
import { Input } from '@/modules/mindmap/components/ui/Input';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { useCreateMindmap } from '../hooks';

export function CreateMindmapDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateMindmap();

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(
      { title: title.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
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
