'use client';

import { useMemo } from 'react';
import { TreeNode } from '@/modules/mindmap/mindmaps/types';
import { BRANCH_PALETTE, ROOT_COLOR } from './colors';

export interface MindmapTree {
  root: TreeNode | null;
  byId: Map<number, TreeNode>;
  childrenOf: Map<number, TreeNode[]>;
  /** Nodes actually rendered (collapsed subtrees omitted). */
  visible: TreeNode[];
  colorOf: Map<number, string>;
  /** Subtree todo rollup, including the node's own todos. */
  rollup: Map<number, { done: number; total: number }>;
  descendants: Map<number, number>;
}

const EMPTY: TreeNode[] = [];

export function useMindmapTree(nodes: TreeNode[] | undefined): MindmapTree {
  return useMemo(() => {
    const byId = new Map<number, TreeNode>();
    const childrenOf = new Map<number, TreeNode[]>();
    let root: TreeNode | null = null;

    for (const n of nodes ?? []) {
      byId.set(n.id, n);
      if (n.parentId === null) {
        root = n;
      } else {
        const siblings = childrenOf.get(n.parentId) ?? [];
        siblings.push(n);
        childrenOf.set(n.parentId, siblings);
      }
    }
    for (const siblings of childrenOf.values()) {
      siblings.sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
    }
    const children = (id: number) => childrenOf.get(id) ?? EMPTY;

    // Visible set: DFS, stop descending at collapsed nodes.
    const visible: TreeNode[] = [];
    if (root) {
      const visit = (n: TreeNode) => {
        visible.push(n);
        if (!n.collapsed) children(n.id).forEach(visit);
      };
      visit(root);
    }

    // Branch colors.
    const colorOf = new Map<number, string>();
    if (root) {
      colorOf.set(root.id, root.color ?? ROOT_COLOR);
      const walk = (n: TreeNode, inherited: string) => {
        const effective = n.color ?? inherited;
        colorOf.set(n.id, effective);
        children(n.id).forEach((c) => walk(c, effective));
      };
      children(root.id).forEach((c, i) =>
        walk(c, BRANCH_PALETTE[i % BRANCH_PALETTE.length]),
      );
    }

    // Post-order rollups: todo progress + descendant counts.
    const rollup = new Map<number, { done: number; total: number }>();
    const descendants = new Map<number, number>();
    const post = (n: TreeNode): { done: number; total: number; count: number } => {
      let done = n.todoDone;
      let total = n.todoTotal;
      let count = 0;
      for (const c of children(n.id)) {
        const sub = post(c);
        done += sub.done;
        total += sub.total;
        count += 1 + sub.count;
      }
      rollup.set(n.id, { done, total });
      descendants.set(n.id, count);
      return { done, total, count };
    };
    if (root) post(root);

    return { root, byId, childrenOf, visible, colorOf, rollup, descendants };
  }, [nodes]);
}

/** Ids of a node's whole subtree (itself included) — used to forbid cyclic re-parenting. */
export function collectSubtreeIds(
  tree: MindmapTree,
  nodeId: number,
): Set<number> {
  const ids = new Set<number>([nodeId]);
  const stack = [nodeId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of tree.childrenOf.get(current) ?? []) {
      ids.add(child.id);
      stack.push(child.id);
    }
  }
  return ids;
}
