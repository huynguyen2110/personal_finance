'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Node,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import {
  useCreateNode,
  useDeleteNode,
  useMindmap,
  useNodes,
  useUpdateNode,
} from '@/modules/mindmap/mindmaps/hooks';
import { PropertyDefinitionManager } from '@/modules/mindmap/properties/components/PropertyDefinitionManager';
import { useProperties } from '@/modules/mindmap/properties/hooks';
import { buildChips, NodeChip } from '../chips';
import { layoutTree } from '../layout';
import { MindFlowNode } from '../types';
import { collectSubtreeIds, useMindmapTree } from '../useMindmapTree';
import { CanvasToolbar } from './CanvasToolbar';
import { MindNode } from './MindNode';

const nodeTypes = { mindNode: MindNode };

function CanvasInner({ mindmapId }: { mindmapId: number }) {
  const { data: mindmap } = useMindmap(mindmapId);
  const { data: treeData, isLoading } = useNodes(mindmapId);
  const { data: definitions } = useProperties(mindmapId);
  const tree = useMindmapTree(treeData);

  // React Query's .mutate is referentially stable — safe as a dependency.
  const { mutate: mutateCreate } = useCreateNode(mindmapId);
  const { mutate: mutateUpdate } = useUpdateNode(mindmapId);
  const { mutate: mutateDelete } = useDeleteNode(mindmapId);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  // Giá trị mới nhất cho trình xử lý phím (gắn một lần), cập nhật sau mỗi lần render
  const selectedIdRef = useRef(selectedId);
  const editingIdRef = useRef(editingId);
  useLayoutEffect(() => {
    selectedIdRef.current = selectedId;
    editingIdRef.current = editingId;
  }, [selectedId, editingId]);

  const { getIntersectingNodes } = useReactFlow();

  const commitTitle = useCallback(
    (nodeId: number, title: string) => {
      setEditingId(null);
      mutateUpdate({ nodeId, title });
    },
    [mutateUpdate],
  );
  const cancelEdit = useCallback(() => setEditingId(null), []);
  const toggleCollapse = useCallback(
    (nodeId: number, collapsed: boolean) => {
      mutateUpdate({ nodeId, collapsed });
    },
    [mutateUpdate],
  );

  // Layout-owned positions: xyflow nodes + edges derived from the tree.
  const { layoutedNodes, edges } = useMemo(() => {
    const chipsOf = new Map<number, NodeChip[]>(
      tree.visible.map((n) => [n.id, buildChips(n.propertyValues, definitions)]),
    );
    const rects = layoutTree(tree.visible, tree.root?.id ?? null, chipsOf);
    const visibleIds = new Set(tree.visible.map((n) => n.id));

    const nodes: MindFlowNode[] = tree.visible.map((n) => {
      const rect = rects.get(n.id)!;
      const rollup = tree.rollup.get(n.id) ?? { done: 0, total: 0 };
      const isRoot = n.parentId === null;
      return {
        id: String(n.id),
        type: 'mindNode',
        position: { x: rect.x, y: rect.y },
        selected: n.id === selectedId,
        draggable: !isRoot && editingId !== n.id,
        data: {
          nodeId: n.id,
          mindmapId,
          title: n.title,
          color: tree.colorOf.get(n.id) ?? '#6b7280',
          isRoot,
          collapsed: n.collapsed,
          hasPage: n.hasPage,
          descendants: tree.descendants.get(n.id) ?? 0,
          todoDone: rollup.done,
          todoTotal: rollup.total,
          chips: chipsOf.get(n.id) ?? [],
          editing: editingId === n.id,
          onCommitTitle: commitTitle,
          onCancelEdit: cancelEdit,
          onToggleCollapse: toggleCollapse,
        },
      };
    });

    const flowEdges: Edge[] = tree.visible
      .filter((n) => n.parentId !== null && visibleIds.has(n.parentId))
      .map((n) => ({
        id: `e${n.parentId}-${n.id}`,
        source: String(n.parentId),
        target: String(n.id),
        type: 'default',
        style: {
          stroke: tree.colorOf.get(n.id) ?? '#9ca3af',
          strokeWidth: 2,
        },
      }));

    return { layoutedNodes: nodes, edges: flowEdges };
  }, [tree, definitions, selectedId, editingId, mindmapId, commitTitle, cancelEdit, toggleCollapse]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MindFlowNode>([]);
  const layoutedRef = useRef(layoutedNodes);
  useEffect(() => {
    layoutedRef.current = layoutedNodes;
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  // ----- create helpers -----
  const spawnNode = useCallback(
    (parentId: number) => {
      const parent = tree.byId.get(parentId);
      if (parent?.collapsed) {
        mutateUpdate({ nodeId: parentId, collapsed: false });
      }
      mutateCreate(
        { parentId, title: 'Nhánh mới' },
        {
          onSuccess: (created) => {
            setSelectedId(created.id);
            setEditingId(created.id);
          },
        },
      );
    },
    [mutateCreate, tree, mutateUpdate],
  );

  const removeNode = useCallback(
    (nodeId: number) => {
      const node = tree.byId.get(nodeId);
      if (!node || node.parentId === null) return;
      const count = tree.descendants.get(nodeId) ?? 0;
      if (
        count === 0 ||
        confirm(`Xóa nhánh "${node.title}" và ${count} node con?`)
      ) {
        setSelectedId(node.parentId);
        mutateDelete(nodeId);
      }
    },
    [mutateDelete, tree],
  );

  // ----- keyboard shortcuts -----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      ) {
        return;
      }
      if (editingIdRef.current !== null) return;
      const selected = selectedIdRef.current
        ? tree.byId.get(selectedIdRef.current)
        : null;
      if (!selected) return;

      // e.key can be empty on synthetic events — fall back to code/keyCode.
      const key = e.key || e.code || (e.keyCode === 13 ? 'Enter' : '');
      if (key === 'Tab') {
        e.preventDefault();
        spawnNode(selected.id);
      } else if (key === 'Enter' || key === 'NumpadEnter') {
        e.preventDefault();
        spawnNode(selected.parentId ?? selected.id);
      } else if (key === 'F2') {
        e.preventDefault();
        setEditingId(selected.id);
      } else if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault();
        removeNode(selected.id);
      }
    };
    // Capture phase: run before xyflow's node-level a11y handler (it swallows Enter).
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [tree, spawnNode, removeNode]);

  // ----- drag to re-parent -----
  const onNodeDragStop = useCallback(
    (_event: unknown, dragged: Node) => {
      const draggedId = Number(dragged.id);
      const node = tree.byId.get(draggedId);
      if (node && node.parentId !== null) {
        const forbidden = collectSubtreeIds(tree, draggedId);
        const center = (n: Node) => ({
          x: n.position.x + (n.measured?.width ?? n.width ?? 0) / 2,
          y: n.position.y + (n.measured?.height ?? n.height ?? 0) / 2,
        });
        const dragCenter = center(dragged);
        // Among intersecting candidates, drop onto the closest one.
        const target = getIntersectingNodes(dragged)
          .filter((n) => !forbidden.has(Number(n.id)))
          .map((n) => {
            const c = center(n as Node);
            return {
              id: Number(n.id),
              dist: (c.x - dragCenter.x) ** 2 + (c.y - dragCenter.y) ** 2,
            };
          })
          .sort((a, b) => a.dist - b.dist)[0]?.id;
        if (target !== undefined && target !== node.parentId) {
          mutateUpdate({ nodeId: draggedId, parentId: target });
          return;
        }
      }
      // No valid drop target: snap back to layout positions.
      setNodes(layoutedRef.current);
    },
    [tree, getIntersectingNodes, mutateUpdate, setNodes],
  );

  if (isLoading) return <Spinner className="h-full" />;

  return (
    <div className="h-full w-full" style={{ background: 'var(--canvas-bg)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => setSelectedId(Number(n.id))}
        onNodeDoubleClick={(_, n) => {
          setSelectedId(Number(n.id));
          setEditingId(Number(n.id));
        }}
        onPaneClick={() => {
          setSelectedId(null);
          setEditingId(null);
        }}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        zoomOnDoubleClick={false}
        panOnScroll
        deleteKeyCode={null}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Controls showInteractive={false} />
        <CanvasToolbar
          title={mindmap?.title ?? ''}
          onOpenProperties={() => setPropertiesOpen(true)}
        />
      </ReactFlow>

      <PropertyDefinitionManager
        mindmapId={mindmapId}
        open={propertiesOpen}
        onClose={() => setPropertiesOpen(false)}
      />
    </div>
  );
}

export function MindmapCanvas({ mindmapId }: { mindmapId: number }) {
  return (
    <ReactFlowProvider>
      <CanvasInner mindmapId={mindmapId} />
    </ReactFlowProvider>
  );
}
