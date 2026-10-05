import { createsCycle, createsLinkCycle, depthAndArea, subtreeIds } from './tree';

//      1
//    2   3
//   4 5
//   6
const nodes = [
  { id: 1, parentId: null },
  { id: 2, parentId: 1 },
  { id: 3, parentId: 1 },
  { id: 4, parentId: 2 },
  { id: 5, parentId: 2 },
  { id: 6, parentId: 4 },
];

describe('mindmap tree', () => {
  it('createsCycle: không được làm cha của chính mình hay chuyển vào cây con', () => {
    expect(createsCycle(nodes, 2, 2)).toBe(true);
    expect(createsCycle(nodes, 2, 6)).toBe(true);
    expect(createsCycle(nodes, 2, 4)).toBe(true);
    expect(createsCycle(nodes, 4, 3)).toBe(false);
    expect(createsCycle(nodes, 6, 1)).toBe(false);
  });

  it('subtreeIds: gồm node và mọi node con cháu', () => {
    expect(subtreeIds(nodes, 2).sort()).toEqual([2, 4, 5, 6]);
    expect(subtreeIds(nodes, 3)).toEqual([3]);
    expect(subtreeIds(nodes, 1)).toHaveLength(6);
  });

  it('createsLinkCycle: chặn tự nối và vòng điều kiện trước, cho phép nhánh song song', () => {
    const edges = [
      { sourceNodeId: 4, targetNodeId: 5 },
      { sourceNodeId: 5, targetNodeId: 6 },
    ];
    expect(createsLinkCycle(edges, 4, 4)).toBe(true);
    expect(createsLinkCycle(edges, 6, 4)).toBe(true);
    expect(createsLinkCycle(edges, 5, 4)).toBe(true);
    expect(createsLinkCycle(edges, 4, 6)).toBe(false);
    expect(createsLinkCycle(edges, 3, 4)).toBe(false);
  });

  it('depthAndArea: lĩnh vực = tổ tiên cấp 1, gốc không có lĩnh vực', () => {
    const info = depthAndArea(nodes);
    expect(info.get(1)).toEqual({ depth: 0, areaId: null });
    expect(info.get(2)).toEqual({ depth: 1, areaId: 2 });
    expect(info.get(3)).toEqual({ depth: 1, areaId: 3 });
    expect(info.get(6)).toEqual({ depth: 3, areaId: 2 });
  });
});
