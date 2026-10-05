'use client';

import { useParams } from 'next/navigation';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { PrimaryMindmapGate } from '@/modules/mindmap/mindmaps/components/PrimaryMindmapGate';
import { LinksSection } from '@/modules/mindmap/node-page/components/LinksSection';
import { LinkedTodosSection } from '@/modules/mindmap/node-page/components/LinkedTodosSection';
import { NodePageEditor } from '@/modules/mindmap/node-page/components/NodePageEditor';
import { NodePageHeader } from '@/modules/mindmap/node-page/components/NodePageHeader';
import { PropertyPanel } from '@/modules/mindmap/node-page/components/PropertyPanel';
import { useNodeDetail } from '@/modules/mindmap/node-page/hooks';

export default function NodePage() {
  const params = useParams<{ nodeId: string }>();
  const nodeId = Number(params.nodeId);
  return (
    <PrimaryMindmapGate className="h-full">
      {(mindmapId) => <NodeView mindmapId={mindmapId} nodeId={nodeId} />}
    </PrimaryMindmapGate>
  );
}

function NodeView({ mindmapId, nodeId }: { mindmapId: number; nodeId: number }) {
  const { data: node, isLoading } = useNodeDetail(mindmapId, nodeId);

  if (isLoading || !node) return <Spinner className="h-full" />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-8">
      <NodePageHeader
        mindmapId={mindmapId}
        nodeId={nodeId}
        title={node.title}
      />
      <PropertyPanel
        mindmapId={mindmapId}
        nodeId={nodeId}
        values={node.propertyValues}
        status={node.status}
        isRoot={node.parentId === null}
      />
      <LinksSection mindmapId={mindmapId} nodeId={nodeId} />
      <LinkedTodosSection nodeId={nodeId} />
      <div className="rounded-xl border border-gray-200 bg-white p-6 pt-10">
        <NodePageEditor
          key={nodeId}
          mindmapId={mindmapId}
          nodeId={nodeId}
          initialContent={node.pageContent}
        />
      </div>
    </div>
  );
}
