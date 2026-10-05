'use client';

import { PrimaryMindmapGate } from '@/modules/mindmap/mindmaps/components/PrimaryMindmapGate';
import { TodosView } from '@/modules/mindmap/todos/components/TodosView';

export default function TodosPage() {
  return (
    <PrimaryMindmapGate>
      {(mindmapId) => <TodosView mindmapId={mindmapId} />}
    </PrimaryMindmapGate>
  );
}
