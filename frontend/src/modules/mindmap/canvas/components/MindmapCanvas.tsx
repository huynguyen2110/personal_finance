'use client';

import {
  Background,
  BackgroundVariant,
  Edge,
  MarkerType,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { LocateFixed, Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@/modules/mindmap/components/ui/Spinner';
import { cn } from '@/modules/mindmap/lib/utils';
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
import { estimateNodeSize, FIT_VIEW, layoutTree } from '../layout';
import { dependencyMeta, roleMeta } from '../nodeMeta';
import { MindFlowNode, NodeKind } from '../types';
import { collectSubtreeIds, useMindmapTree } from '../useMindmapTree';
import { LinkEdge } from './LinkEdge';
import { MapInspector } from './MapInspector';
import { LinkMode, MapToolbar } from './MapToolbar';
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
  // Liên kết: chỉ của nhánh đang chọn / rê chuột (mặc định, đỡ rối) hoặc tất cả (mạng lưới)
  const [linkMode, setLinkMode] = useState<LinkMode>('selected');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  // Chỉ hiện một lĩnh vực (nhánh cấp 1); null = tất cả
  const [focusAreaId, setFocusAreaId] = useState<number | null>(null);
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

  const { getIntersectingNodes, fitView } = useReactFlow();

  // Lĩnh vực (nhánh cấp 1) chứa mỗi node
  const areaOf = useMemo(() => {
    const map = new Map<number, number>();
    const rootId = tree.root?.id;
    for (const n of tree.byId.values()) {
      let cursor: typeof n | undefined = n;
      while (cursor && cursor.parentId !== null && cursor.parentId !== rootId) {
        cursor = tree.byId.get(cursor.parentId);
      }
      if (cursor && cursor.parentId === rootId) map.set(n.id, cursor.id);
    }
    return map;
  }, [tree]);
  const areas = useMemo(
    () => (tree.root ? (tree.childrenOf.get(tree.root.id) ?? []) : []),
    [tree],
  );
  // Lĩnh vực đang tập trung đã bị xóa → về xem tất cả
  const focusId =
    focusAreaId !== null && tree.byId.has(focusAreaId) ? focusAreaId : null;
  const displayed = useMemo(
    () =>
      focusId === null
        ? tree.visible
        : tree.visible.filter(
            (n) => n.parentId === null || areaOf.get(n.id) === focusId,
          ),
    [tree, focusId, areaOf],
  );

  // Đổi lĩnh vực tập trung → vừa khung nhìn với phần đang hiện (chờ React Flow đo xong các node mới)
  const nodesInitialized = useNodesInitialized();
  const pendingFitRef = useRef(false);
  useEffect(() => {
    pendingFitRef.current = true;
  }, [focusId]);

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

  // Layout-owned positions: xyflow nodes + tree edges (bố cục 2 bên quanh nút gốc).
  const { layoutedNodes, treeEdges, side, displayedIds } = useMemo(() => {
    const rootId = tree.root?.id ?? null;
    const kindOf = (parentId: number | null): NodeKind =>
      parentId === null ? 'root' : parentId === rootId ? 'area' : 'action';
    const info = new Map(
      displayed.map((n) => [
        n.id,
        {
          kind: kindOf(n.parentId),
          meta: roleMeta(n.propertyValues, definitions),
          rollup: tree.rollup.get(n.id) ?? { done: 0, total: 0 },
          ...dependencyMeta(n.id, links, tree.byId),
        },
      ]),
    );
    const { rects, side } = layoutTree(displayed, rootId, (n) => {
      const i = info.get(n.id)!;
      return estimateNodeSize(i.kind, n.title, {
        hasBadge: !!i.meta.priority,
        hasChips: i.meta.extraChips.length > 0,
        hasProgress: i.rollup.total > 0,
      });
    });
    const displayedIds = new Set(displayed.map((n) => n.id));

    const nodes: MindFlowNode[] = displayed.map((n) => {
      const rect = rects.get(n.id)!;
      const { kind, meta, rollup, blockedBy, unlocks } = info.get(n.id)!;
      const isRoot = kind === 'root';
      return {
        id: String(n.id),
        type: 'mindNode',
        position: { x: rect.x, y: rect.y },
        selected: n.id === selectedId,
        draggable: !isRoot && editingId !== n.id,
        data: {
          nodeId: n.id,
          mindmapId,
          kind,
          title: n.title,
          color: tree.colorOf.get(n.id) ?? '#7c3aed',
          collapsed: n.collapsed,
          hasPage: n.hasPage,
          status: n.status,
          descendants: tree.descendants.get(n.id) ?? 0,
          todoDone: rollup.done,
          todoTotal: rollup.total,
          meta,
          blockedBy,
          unlocks,
          editing: editingId === n.id,
          side: side.get(n.id) ?? 'right',
          linkSource: linkingFrom === n.id,
          onCommitTitle: commitTitle,
          onCancelEdit: cancelEdit,
          onToggleCollapse: toggleCollapse,
          onStartLink: startLink,
        },
      };
    });

    const treeEdges: Edge[] = displayed
      .filter((n) => n.parentId !== null && displayedIds.has(n.parentId))
      .map((n) => {
        const left = side.get(n.id) === 'left';
        return {
          id: `e${n.parentId}-${n.id}`,
          source: String(n.parentId),
          target: String(n.id),
          sourceHandle: left ? 'out-l' : 'out-r',
          targetHandle: left ? 'in-r' : 'in-l',
          type: 'default',
          // Cạnh gốc → lĩnh vực đậm, cạnh tới hành động mảnh và nhạt hơn
          style: {
            stroke: tree.colorOf.get(n.id) ?? '#9ca3af',
            strokeWidth: n.parentId === rootId ? 2.5 : 1.8,
            strokeOpacity: n.parentId === rootId ? 0.85 : 0.45,
          },
        };
      });

    return { layoutedNodes: nodes, treeEdges, side, displayedIds };
  }, [
    tree,
    displayed,
    definitions,
    links,
    selectedId,
    editingId,
    linkingFrom,
    mindmapId,
    commitTitle,
    cancelEdit,
    toggleCollapse,
    startLink,
  ]);

  // Liên kết ngang (tách khỏi bố cục để rê chuột không phải xếp lại cây).
  // Chỉ vẽ khi cả hai đầu đang hiện; chế độ "khi chọn" chỉ vẽ liên kết của nhánh đang chọn / rê chuột.
  const edges = useMemo(() => {
    const active = new Set(
      [selectedId, hoveredId].filter((id): id is number => id !== null),
    );
    const handle = (nodeId: number) =>
      side.get(nodeId) === 'left' ? 'l' : 'r';
    const linkEdges: Edge[] = (links ?? [])
            .filter(
              (l) =>
                displayedIds.has(l.sourceNodeId) &&
                displayedIds.has(l.targetNodeId) &&
                (linkMode === 'all' ||
                  active.has(l.sourceNodeId) ||
                  active.has(l.targetNodeId)),
            )
            .map((l) => {
              const meta = LINK_KINDS[l.kind];
              const edge: Edge = {
                id: `link-${l.id}`,
                source: String(l.sourceNodeId),
                target: String(l.targetNodeId),
                sourceHandle: `link-out-${handle(l.sourceNodeId)}`,
                targetHandle: `link-in-${handle(l.targetNodeId)}`,
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
            });
    return [...treeEdges, ...linkEdges];
  }, [treeEdges, links, linkMode, selectedId, hoveredId, side, displayedIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MindFlowNode>([]);
  const layoutedRef = useRef(layoutedNodes);
  useEffect(() => {
    layoutedRef.current = layoutedNodes;
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    if (!pendingFitRef.current || !nodesInitialized) return;
    pendingFitRef.current = false;
    fitView(FIT_VIEW);
  }, [nodesInitialized, nodes, fitView]);

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
            if (focusId !== null && parentId === tree.root?.id) {
              setFocusAreaId(created.id);
            }
            setSelectedId(created.id);
            setEditingId(created.id);
          },
        },
      );
    },
    [mutateCreate, tree, mutateUpdate, focusId],
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

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col overflow-hidden bg-[#faf8ff] select-none"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <MapToolbar
        title={mindmap?.title ?? ''}
        links={links ?? []}
        areas={areas.map((a) => ({ id: a.id, title: a.title }))}
        focusAreaId={focusId}
        onFocusChange={setFocusAreaId}
        linkMode={linkMode}
        onLinkModeChange={setLinkMode}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        onOpenProperties={() => setPropertiesOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
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
              setInspectorOpen(true);
            }}
            onEdgeClick={(_, edge) => {
              const link = (edge.data as { link?: NodeLink } | undefined)?.link;
              if (link) setLinkDialog({ mode: 'edit', link });
            }}
            onNodeMouseEnter={(_, n) => setHoveredId(Number(n.id))}
            onNodeMouseLeave={() => setHoveredId(null)}
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
            fitViewOptions={FIT_VIEW}
            minZoom={0.2}
            maxZoom={2}
            zoomOnDoubleClick={false}
            panOnScroll
            deleteKeyCode={null}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.4}
              color="#d2d9f4"
            />

            {linkingFrom !== null && (
              <Panel position="top-center">
                <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800 shadow-lg">
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

            {/* Chú thích: màu lĩnh vực + kiểu liên kết */}
            <Panel position="bottom-left">
              <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white/90 px-3 py-2 text-[11px] font-semibold text-gray-500 shadow-md backdrop-blur-md">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setFocusAreaId(focusId === a.id ? null : a.id)}
                    title={focusId === a.id ? 'Bỏ tập trung' : 'Chỉ hiện lĩnh vực này'}
                    className={cn(
                      'flex items-center gap-1.5 hover:text-gray-900',
                      focusId === a.id && 'text-gray-900 underline',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tree.colorOf.get(a.id) }}
                    />
                    {a.title}
                  </button>
                ))}
                {areas.length > 0 && <span className="h-3.5 w-px bg-gray-200" />}
                {(Object.keys(LINK_KINDS) as (keyof typeof LINK_KINDS)[]).map((k) => (
                  <span key={k} className="flex items-center gap-1" style={{ color: LINK_KINDS[k].color }}>
                    <svg width="16" height="6">
                      <line
                        x1="0"
                        y1="3"
                        x2="16"
                        y2="3"
                        stroke={LINK_KINDS[k].color}
                        strokeWidth="2"
                        strokeDasharray={LINK_KINDS[k].dash}
                      />
                    </svg>
                    {LINK_KINDS[k].label}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel position="bottom-right">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  title="Căn giữa / vừa màn hình"
                  onClick={() => fitView(FIT_VIEW)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-800 shadow-md transition hover:text-violet-700"
                >
                  <LocateFixed size={19} />
                </button>
                <button
                  type="button"
                  title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                  onClick={toggleFullscreen}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-800 shadow-md transition hover:text-violet-700"
                >
                  {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {inspectorOpen && (
          <MapInspector
            mindmapId={mindmapId}
            nodeId={selectedId}
            tree={tree}
            definitions={definitions}
            links={links ?? []}
            onSelect={(id) => setSelectedId(id)}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>

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
