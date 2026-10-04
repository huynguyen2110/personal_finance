import { createsCycle, subtreeIds } from './tree';

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
});
