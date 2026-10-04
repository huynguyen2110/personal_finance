'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { EmptyState } from '@/modules/mindmap/components/ui/EmptyState';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { CreateMindmapDialog } from '@/modules/mindmap/mindmaps/components/CreateMindmapDialog';
import { MindmapCard } from '@/modules/mindmap/mindmaps/components/MindmapCard';
import { useMindmaps } from '@/modules/mindmap/mindmaps/hooks';

export default function MindmapsPage() {
  const { data, isLoading } = useMindmaps();
  const [creating, setCreating] = useState(false);

  return (
    <div className="page-in mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mindmap của tôi</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Tổ chức ý tưởng thành sơ đồ trực quan
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> Tạo mindmap
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Chưa có mindmap nào"
          description="Tạo mindmap đầu tiên để bắt đầu tổ chức ý tưởng."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> Tạo mindmap
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <MindmapCard key={m.id} mindmap={m} />
          ))}
        </div>
      )}

      <CreateMindmapDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
