'use client';

import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { usePrimaryMindmap } from '../hooks';

/** Lấy (lần đầu thì tạo) bản đồ Phát triển bản thân rồi render nội dung với id của nó. */
export function PrimaryMindmapGate({
  children,
  className,
}: {
  children: (mindmapId: number) => React.ReactNode;
  className?: string;
}) {
  const { data, isLoading, error } = usePrimaryMindmap();
  if (isLoading) return <Spinner className={className} />;
  if (error || !data) {
    return (
      <p className="p-8 text-sm text-red-600">
        {extractErrorMessage(error) || 'Không tải được bản đồ'}
      </p>
    );
  }
  return <>{children(data.id)}</>;
}
