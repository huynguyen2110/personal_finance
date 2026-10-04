'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { LINK_KINDS, NodeLink } from '@/modules/mindmap/links/api';
import {
  LinkDialog,
  LinkDialogTarget,
} from '@/modules/mindmap/links/components/LinkDialog';
import { useLinks } from '@/modules/mindmap/links/hooks';
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
import { LinkEdge } from './LinkEdge';
import { MindNode } from './MindNode';

const nodeTypes = { mindNode: MindNode };
const edgeTypes = { link: LinkEdge };

function CanvasInner({ mindmapId }: { mindmapId: number }) {
  const { data: mindmap } = useMindmap(mindmapId);
  const { data: treeData, isLoading } = useNodes(mindmapId);
  const { data: definitions } = useProperties(mindmapId);
  const { data: links } = useLinks(mindmapId);
  const tree = useMindmapTree(treeData);

  // React Query's .mutate is referentially stable — safe as a dependency.
  const { mutate: mutateCreate } = useCreateNode(mindmapId);
  const { mutate: mutateUpdate } = useUpdateNode(mindmapId);
  const { mutate: mutateDelete } = useDeleteNode(mindmapId);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  // Đang chọn nhánh đích cho liên kết bắt đầu từ nhánh này
  const [linkingFrom, setLinkingFrom] = useState<number | null>(null);
  const [linkDialog, setLinkDialog] = useState<LinkDialogTarget | null>(null);

  // Giá trị mới nhất cho trình xử lý phím (gắn một lần), cập nhật sau mỗi lần render
  const selectedIdRef = useRef(selectedId);
  const editingIdRef = useRef(editingId);
  const linkingFromRef = useRef(linkingFrom);
  useLayoutEffect(() => {
    selectedIdRef.current = selectedId;
    editingIdRef.current = editingId;
    linkingFromRef.current = linkingFrom;
  }, [selectedId, editingId, linkingFrom]);

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

  const startLink = useCallback((nodeId: number) => {
    setEditingId(null);
    setLinkingFrom(nodeId);
  }, []);

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
          status: n.status,
          descendants: tree.descendants.get(n.id) ?? 0,
          todoDone: rollup.done,
          todoTotal: rollup.total,
          chips: chipsOf.get(n.id) ?? [],
          editing: editingId === n.id,
          linkSource: linkingFrom === n.id,
          onCommitTitle: commitTitle,
          onCancelEdit: cancelEdit,
          onToggleCollapse: toggleCollapse,
          onStartLink: startLink,
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

    // Liên kết ngang: chỉ vẽ khi cả hai đầu đang hiện (không bị thu gọn)
    const linkEdges: Edge[] = showLinks
      ? (links ?? [])
          .filter(
            (l) =>
              visibleIds.has(l.sourceNodeId) && visibleIds.has(l.targetNodeId),
          )
          .map((l) => {
            const meta = LINK_KINDS[l.kind];
            const edge: Edge = {
              id: `link-${l.id}`,
              source: String(l.sourceNodeId),
              target: String(l.targetNodeId),
              sourceHandle: 'link-out',
              targetHandle: 'link-in',
              type: 'link',
              zIndex: 1,
              data: { link: l },
              label: l.note ?? undefined,
              markerEnd: meta.arrow
                ? {
                    type: MarkerType.ArrowClosed,
                    color: meta.color,
                    width: 16,
                    height: 16,
                  }
                : undefined,
              style: {
                stroke: meta.color,
                strokeWidth: 1.75,
                strokeDasharray: meta.dash,
                cursor: 'pointer',
              },
            };
            return edge;
          })
      : [];

    return { layoutedNodes: nodes, edges: [...flowEdges, ...linkEdges] };
  }, [
    tree,
    definitions,
    links,
    showLinks,
    selectedId,
    editingId,
    linkingFrom,
    mindmapId,
    commitTitle,
    cancelEdit,
    toggleCollapse,
    startLink,
  ]);

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
      if (linkingFromRef.current !== null && e.key === 'Escape') {
        setLinkingFrom(null);
        return;
      }
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
      } else if (key === 'l' || key === 'L' || key === 'KeyL') {
        e.preventDefault();
        setLinkingFrom(selected.id);
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
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => {
          const id = Number(n.id);
          if (linkingFrom !== null && linkingFrom !== id) {
            setLinkDialog({
              mode: 'create',
              sourceId: linkingFrom,
              targetId: id,
            });
            setLinkingFrom(null);
          }
          setSelectedId(id);
        }}
        onEdgeClick={(_, edge) => {
          const link = (edge.data as { link?: NodeLink } | undefined)?.link;
          if (link) setLinkDialog({ mode: 'edit', link });
        }}
        onNodeDoubleClick={(_, n) => {
          setSelectedId(Number(n.id));
          setEditingId(Number(n.id));
        }}
        onPaneClick={() => {
          setSelectedId(null);
          setEditingId(null);
          setLinkingFrom(null);
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
          showLinks={showLinks}
          linkCount={links?.length ?? 0}
          onToggleLinks={() => setShowLinks((v) => !v)}
        />
        {linkingFrom !== null && (
          <Panel position="top-center">
            <div className="mt-14 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 shadow-lg">
              Chọn nhánh đích để nối với{' '}
              <b>&quot;{tree.byId.get(linkingFrom)?.title}&quot;</b>
              <button
                onClick={() => setLinkingFrom(null)}
                className="rounded px-1.5 py-0.5 font-medium hover:bg-orange-100"
              >
                Hủy (Esc)
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      <LinkDialog
        mindmapId={mindmapId}
        target={linkDialog}
        titleOf={(id) => tree.byId.get(id)?.title ?? `#${id}`}
        onClose={() => setLinkDialog(null)}
      />

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
