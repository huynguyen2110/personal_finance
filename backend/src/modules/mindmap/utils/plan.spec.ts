import { aggregateByArea, buildPlan, optionLevels, type PlanDefinition, type PlanNode, type PlanTodo } from './plan';

// 1 Gốc
// ├─ 10 Tiếng Anh (ưu tiên cao)
// │   ├─ 11 Học từ vựng   (dễ, 0đ, 1 giờ)          → điều kiện trước của 12, bổ trợ 21
// │   └─ 12 Luyện IELTS   (khó, 5tr, 100 giờ)      → bị chặn bởi 11
// └─ 20 Sức khỏe (ưu tiên thấp)
//     ├─ 21 Đọc sách y học (vừa)                   → có bước con 22 chưa xong
//     │   └─ 22 Mua sách (dễ, 200k)
//     └─ 23 Chạy bộ (xong)
const nodes: PlanNode[] = [
  { id: 1, parentId: null, title: 'Gốc', status: null, orderIndex: 0 },
  { id: 10, parentId: 1, title: 'Tiếng Anh', status: null, orderIndex: 0 },
  { id: 11, parentId: 10, title: 'Học từ vựng', status: 'doing', orderIndex: 0 },
  { id: 12, parentId: 10, title: 'Luyện IELTS', status: null, orderIndex: 1 },
  { id: 20, parentId: 1, title: 'Sức khỏe', status: null, orderIndex: 1 },
  { id: 21, parentId: 20, title: 'Đọc sách y học', status: 'todo', orderIndex: 0 },
  { id: 22, parentId: 21, title: 'Mua sách', status: null, orderIndex: 0 },
  { id: 23, parentId: 20, title: 'Chạy bộ', status: 'done', orderIndex: 1 },
];

const definitions: PlanDefinition[] = [
  {
    id: 1,
    role: 'priority',
    options: [
      { id: 'high', label: 'Cao', color: '#f00', weight: 3 },
      { id: 'medium', label: 'Trung bình', color: '#fa0', weight: 2 },
      { id: 'low', label: 'Thấp', color: '#999', weight: 1 },
    ],
  },
  {
    id: 2,
    role: 'difficulty',
    options: [
      { id: 'easy', label: 'Dễ', color: '#0a0', weight: 1 },
      { id: 'medium', label: 'Vừa', color: '#00f', weight: 2 },
      { id: 'hard', label: 'Khó', color: '#90f', weight: 3 },
    ],
  },
  { id: 3, role: 'time', options: null },
  { id: 4, role: 'cost', options: null },
];

const v = (nodeId: number, propertyDefinitionId: number, value: unknown) => ({ nodeId, propertyDefinitionId, value });
const values = [
  v(10, 1, 'high'),
  v(20, 1, 'low'),
  v(11, 2, 'easy'),
  v(11, 3, 1),
  v(11, 4, 0),
  v(12, 2, 'hard'),
  v(12, 3, 100),
  v(12, 4, 5_000_000),
  v(21, 2, 'medium'),
  v(22, 2, 'easy'),
  v(22, 4, 200_000),
];

const links = [
  { sourceNodeId: 11, targetNodeId: 12, kind: 'prerequisite' },
  { sourceNodeId: 11, targetNodeId: 21, kind: 'supports' },
  { sourceNodeId: 12, targetNodeId: 21, kind: 'related' },
];

const today = '2026-10-05';
const todo = (date: string, nodeIds: number[], extra: Partial<PlanTodo> = {}): PlanTodo => ({
  date,
  completed: true,
  durationMinutes: null,
  effectiveness: null,
  nodeIds,
  ...extra,
});

describe('mindmap plan', () => {
  it('optionLevels: theo weight, thiếu weight thì theo thứ tự, một lựa chọn = 0.5', () => {
    expect(optionLevels(definitions[0].options)).toEqual(new Map([['high', 1], ['medium', 0.5], ['low', 0]]));
    expect(optionLevels([{ id: 'a', label: 'A', color: '' }, { id: 'b', label: 'B', color: '' }])).toEqual(new Map([['a', 0], ['b', 1]]));
    expect(optionLevels([{ id: 'a', label: 'A', color: '' }]).get('a')).toBe(0.5);
  });

  const plan = buildPlan({
    nodes,
    definitions,
    values,
    links,
    todos: [todo(today, [11], { durationMinutes: 30, effectiveness: 4 }), todo('2026-10-01', [22], { durationMinutes: 20, effectiveness: 2 })],
    today,
  });
  const action = (id: number) => plan.actions.find((a) => a.nodeId === id)!;

  it('hành động = nhánh cấp ≥2, gắn đúng lĩnh vực; ưu tiên kế thừa từ lĩnh vực', () => {
    expect(plan.actions.map((a) => a.nodeId).sort()).toEqual([11, 12, 21, 22, 23]);
    expect(action(22)).toMatchObject({ areaId: 20, areaTitle: 'Sức khỏe', depth: 3 });
    expect(action(11)).toMatchObject({ priority: { id: 'high' }, priorityInherited: true });
    expect(plan.roles).toEqual({ priority: true, difficulty: true, time: true, cost: true });
  });

  it('chặn / mở khóa / bổ trợ theo liên kết; liên kết "liên quan" không ảnh hưởng', () => {
    expect(action(12).blockedBy).toEqual([{ nodeId: 11, title: 'Học từ vựng' }]);
    expect(action(11).unlocks).toEqual([{ nodeId: 12, title: 'Luyện IELTS' }]);
    expect(action(11).supports).toEqual([{ nodeId: 21, title: 'Đọc sách y học' }]);
    expect(action(21).supportedBy).toEqual([{ nodeId: 11, title: 'Học từ vựng' }]);
    expect(plan.blocked.map((a) => a.nodeId)).toEqual([12]);
  });

  it('điểm: ưu tiên cao + dễ + đòn bẩy + rẻ + nhanh + đang làm đứng đầu, kèm lý do', () => {
    // 0.4·1 (ưu tiên) + 0.2·1 (dễ) + 0.2·(2/3) (đòn bẩy) + 0.1·1 (0đ) + 0.1·(1 − 1/100) (1/100 giờ) = 0.932… → 93 + 5 (đang làm)
    expect(action(11).score).toBe(98);
    expect(action(11).reasons).toEqual([
      'Đang làm dở',
      'Lĩnh vực ưu tiên cao',
      'Dễ',
      'Mở khóa 1 việc',
      'Bổ trợ 1 việc',
      'Không tốn tiền',
      'Nhanh (≤ 2 giờ)',
      'Có đà: 30 phút/28 ngày',
    ]);
    expect(plan.next[0].nodeId).toBe(11);
  });

  it('gợi ý tiếp: bỏ việc đã xong, việc bị chặn và việc còn bước con chưa xong', () => {
    expect(plan.next.map((a) => a.nodeId)).toEqual([11, 22]);
    expect(action(21).hasOpenChildren).toBe(true);
  });

  it('todo cộng dồn lên tổ tiên; lĩnh vực: tiến độ, thời gian/chi phí còn lại, cờ bỏ quên', () => {
    expect(action(21).todos).toEqual({ total: 1, done: 1, minutes: 20, avgEffectiveness: 2, lastDate: '2026-10-01' });
    const [english, health] = plan.areas;
    expect(english).toMatchObject({ nodeId: 10, actionsTotal: 2, actionsDone: 0, remainingHours: 101, remainingCost: 5_000_000, neglected: false });
    expect(english.todos).toMatchObject({ minutes: 30, avgEffectiveness: 4 });
    expect(health).toMatchObject({ actionsTotal: 3, actionsDone: 1, remainingCost: 200_000, neglected: false });

    const quiet = buildPlan({ nodes, definitions, values, links, todos: [todo('2026-09-20', [11])], today });
    expect(quiet.areas[0].neglected).toBe(true); // ưu tiên cao, 14 ngày không làm gì
    expect(quiet.areas[1].neglected).toBe(false); // ưu tiên thấp thì không cảnh báo
  });

  it('không có thuộc tính vai trò: mọi thứ trung tính (0.5), vẫn xếp được', () => {
    const bare = buildPlan({ nodes, definitions: [], values: [], links: [], todos: [], today });
    expect(bare.roles).toEqual({ priority: false, difficulty: false, time: false, cost: false });
    // 0.4·0.5 + 0.2·0.5 + 0 + 0.1·0.5 + 0.1·0.5 = 0.4
    expect(bare.actions.find((a) => a.nodeId === 12)!.score).toBe(40);
    // Không còn liên kết → 12 hết bị chặn; 11 đứng đầu nhờ đang làm
    expect(bare.next.map((a) => a.nodeId)).toEqual([11, 12, 22]);
  });
});

describe('aggregateByArea', () => {
  const areaNodes = [
    { id: 1, parentId: null, title: 'Gốc', mindmapId: 1, mindmapTitle: 'A' },
    { id: 10, parentId: 1, title: 'Tiếng Anh', mindmapId: 1, mindmapTitle: 'A' },
    { id: 11, parentId: 10, title: 'Từ vựng', mindmapId: 1, mindmapTitle: 'A' },
    { id: 20, parentId: 1, title: 'Sức khỏe', mindmapId: 1, mindmapTitle: 'A' },
    { id: 100, parentId: null, title: 'Gốc B', mindmapId: 2, mindmapTitle: 'B' },
    { id: 101, parentId: 100, title: 'Code', mindmapId: 2, mindmapTitle: 'B' },
  ];

  it('mỗi lĩnh vực đếm todo một lần, chia đều phút, so với tuần trước, bỏ todo chỉ gắn gốc', () => {
    const rows = aggregateByArea(
      areaNodes,
      [
        todo('2026-10-05', [10, 11], { durationMinutes: 30, effectiveness: 5 }),
        todo('2026-10-05', [11, 20], { durationMinutes: 60, completed: false }),
        todo('2026-10-06', [101], { durationMinutes: 15, effectiveness: 3 }),
        todo('2026-10-06', [1], { durationMinutes: 99 }),
      ],
      [todo('2026-09-29', [11], { durationMinutes: 40 })],
    );
    expect(rows).toEqual([
      { areaId: 10, title: 'Tiếng Anh', mindmapId: 1, mindmapTitle: 'A', total: 2, done: 1, minutes: 60, prevMinutes: 40, avgEffectiveness: 5 },
      { areaId: 20, title: 'Sức khỏe', mindmapId: 1, mindmapTitle: 'A', total: 1, done: 0, minutes: 30, prevMinutes: 0, avgEffectiveness: null },
      { areaId: 101, title: 'Code', mindmapId: 2, mindmapTitle: 'B', total: 1, done: 1, minutes: 15, prevMinutes: 0, avgEffectiveness: 3 },
    ]);
  });
});
