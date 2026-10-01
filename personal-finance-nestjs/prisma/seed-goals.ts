// Dữ liệu mẫu cho trang Mục tiêu tiết kiệm: vài mục tiêu ở đủ trạng thái
// (đúng lộ trình, chậm, quá hạn, đến kỳ nạp, hoàn thành, lưu trữ, dài hạn; chưa tiêu / tiêu một phần / tiêu hết)
// kèm lịch sử nạp/rút/tiêu.
// Không tạo/sửa giao dịch hay tài khoản. Chạy lại an toàn: xóa mục tiêu mẫu cũ rồi tạo lại.
//   npm run seed:goals            → tạo (lại) dữ liệu mẫu
//   npm run seed:goals -- --clear → chỉ xóa dữ liệu mẫu
import { PrismaClient, type ContributionKind, type GoalJar, type GoalPriority } from '@prisma/client';

const prisma = new PrismaClient();
// Đánh dấu mục tiêu mẫu trong ghi chú để xóa đúng phần này
const MARK = '[Dữ liệu mẫu]';

// "YYYY-MM-DD" → 12:00 giờ VN
const at = (d: string) => new Date(`${d}T12:00:00+07:00`);

interface SeedGoal {
  name: string;
  icon: string;
  jar: GoalJar;
  priority?: GoalPriority;
  ongoing?: boolean;
  target: number;
  deadline?: string;
  plan?: { amount: number; day: number; source?: string };
  holding?: { account?: string; name?: string };
  rate?: number;
  createdAt: string;
  completedAt?: string;
  archivedAt?: string;
  note?: string;
  // [ngày, loại, số tiền, ghi chú?]
  history: [string, ContributionKind, number, string?][];
}

const monthly = (from: string, to: string, day: number, amount: number): [string, ContributionKind, number][] => {
  const out: [string, ContributionKind, number][] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y * 12 + m <= ty * 12 + tm) {
    out.push([`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`, 'DEPOSIT', amount]);
    m++;
    if (m > 12) [y, m] = [y + 1, 1];
  }
  return out;
};

const GOALS: SeedGoal[] = [
  {
    // Quỹ duy trì: đúng kế hoạch, không đặt hạn; có lãi hàng tháng; mốc an toàn 3 tháng chi tiêu;
    // đã tiêu một phần (sửa xe) → tiến độ tính theo số còn trong quỹ
    name: 'Quỹ khẩn cấp 6 tháng',
    icon: 'ShieldCheck',
    jar: 'SAFETY',
    priority: 'HIGH',
    ongoing: true,
    target: 100_000_000,
    plan: { amount: 5_000_000, day: 5, source: 'Vietcombank' },
    holding: { account: 'Cake' },
    rate: 5.5,
    createdAt: '2026-03-10',
    history: [
      ['2026-03-10', 'OPENING', 40_000_000, 'Số tiền đã có khi tạo mục tiêu'],
      ...monthly('2026-04', '2026-09', 5, 5_000_000),
      ['2026-07-31', 'INTEREST', 290_000, 'Lãi tháng 7'],
      ['2026-08-31', 'INTEREST', 310_000, 'Lãi tháng 8'],
      ['2026-09-30', 'INTEREST', 325_000, 'Lãi tháng 9'],
      ['2026-08-18', 'SPEND', 3_000_000, 'Sửa xe đột xuất'],
    ],
  },
  {
    // Có hạn, kế hoạch 3tr/tháng chưa đủ → chậm tiến độ
    name: 'Du lịch Nhật Bản mùa hoa anh đào',
    icon: 'Plane',
    jar: 'EXPERIENCE',
    target: 40_000_000,
    deadline: '2027-03',
    plan: { amount: 3_000_000, day: 10, source: 'Vietcombank' },
    holding: { account: 'Vietcombank' },
    rate: 0.2,
    createdAt: '2026-05-15',
    history: [
      ['2026-05-15', 'OPENING', 10_000_000, 'Số tiền đã có khi tạo mục tiêu'],
      ['2026-06-10', 'DEPOSIT', 3_000_000],
      ['2026-07-10', 'DEPOSIT', 3_000_000],
      ['2026-08-12', 'DEPOSIT', 2_000_000, 'Tháng này chi nhiều, nạp ít hơn'],
      ['2026-09-10', 'DEPOSIT', 3_000_000],
      ['2026-09-20', 'SPEND', 8_000_000, 'Đặt cọc vé máy bay'],
    ],
  },
  {
    // Ngày nạp là mùng 1 → hôm nay đến kỳ nạp, chưa nạp → hiện nhắc
    name: 'Đổi xe máy điện',
    icon: 'Bike',
    jar: 'PURCHASE',
    target: 25_000_000,
    deadline: '2027-04',
    plan: { amount: 2_000_000, day: 1, source: 'Vietcombank' },
    holding: { account: 'ACB' },
    rate: 5.1,
    createdAt: '2026-06-01',
    history: [
      ['2026-06-01', 'OPENING', 8_000_000, 'Số tiền đã có khi tạo mục tiêu'],
      ['2026-07-01', 'DEPOSIT', 2_000_000],
      ['2026-08-02', 'DEPOSIT', 2_500_000],
      ['2026-09-01', 'DEPOSIT', 2_000_000],
    ],
  },
  {
    // Không kế hoạch, không hạn → dự báo theo tốc độ nạp thực tế
    name: 'Mua laptop mới',
    icon: 'Laptop',
    jar: 'PURCHASE',
    priority: 'FLEXIBLE',
    target: 30_000_000,
    holding: { name: 'Heo đất tại nhà' },
    createdAt: '2026-08-20',
    history: [
      ['2026-08-20', 'OPENING', 3_000_000, 'Số tiền đã có khi tạo mục tiêu'],
      ['2026-09-05', 'DEPOSIT', 1_500_000],
      ['2026-09-25', 'DEPOSIT', 1_000_000],
    ],
  },
  {
    // Quá hạn mà chưa đạt
    name: 'Quà sinh nhật bố mẹ',
    icon: 'Gift',
    jar: 'OTHER',
    target: 5_000_000,
    deadline: '2026-09',
    createdAt: '2026-07-01',
    history: [
      ['2026-07-03', 'DEPOSIT', 2_000_000],
      ['2026-08-03', 'DEPOSIT', 1_500_000],
    ],
  },
  {
    // Dài hạn (> 1 năm)
    name: 'Quỹ đầu tư hưu trí',
    icon: 'TrendingUp',
    jar: 'INVESTMENT',
    target: 500_000_000,
    deadline: '2035-12',
    plan: { amount: 3_000_000, day: 15, source: 'Vietcombank' },
    holding: { name: 'Chứng chỉ quỹ mở' },
    rate: 7,
    createdAt: '2026-01-10',
    history: [
      ['2026-01-10', 'OPENING', 20_000_000, 'Số tiền đã có khi tạo mục tiêu'],
      ...monthly('2026-02', '2026-09', 15, 3_000_000),
    ],
  },
  {
    // Đã hoàn thành
    name: 'Khóa học chứng chỉ phân tích dữ liệu',
    icon: 'GraduationCap',
    jar: 'SELF',
    target: 15_000_000,
    deadline: '2026-10',
    createdAt: '2026-04-01',
    completedAt: '2026-09-28',
    history: [
      ['2026-04-01', 'OPENING', 5_000_000, 'Số tiền đã có khi tạo mục tiêu'],
      ['2026-05-02', 'DEPOSIT', 3_000_000],
      ['2026-06-02', 'DEPOSIT', 3_000_000],
      ['2026-07-02', 'DEPOSIT', 2_000_000],
      ['2026-08-05', 'WITHDRAW', 500_000, 'Rút mua sách'],
      ['2026-09-28', 'DEPOSIT', 2_500_000, 'Nạp nốt để đóng học phí'],
      ['2026-09-30', 'SPEND', 15_000_000, 'Đóng học phí'],
    ],
  },
  {
    // Đã hoàn thành rồi lưu trữ
    name: 'Quỹ Tết 2026',
    icon: 'Gift',
    jar: 'OTHER',
    target: 10_000_000,
    deadline: '2026-02',
    createdAt: '2025-10-01',
    completedAt: '2026-02-01',
    archivedAt: '2026-02-20',
    history: [...monthly('2025-10', '2026-01', 1, 2_500_000), ['2026-02-10', 'SPEND', 10_000_000, 'Lì xì, sắm Tết']],
  },
];

async function clear() {
  const r = await prisma.savingsGoal.deleteMany({ where: { note: { startsWith: MARK } } });
  return r.count;
}

async function main() {
  const removed = await clear();
  if (process.argv.includes('--clear')) {
    console.log(`✔ Đã xóa ${removed} mục tiêu mẫu`);
    return;
  }

  const accounts = await prisma.account.findMany({ select: { id: true, name: true, bankName: true } });
  const findAccount = (q?: string) =>
    q ? (accounts.find((a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.bankName?.toLowerCase().includes(q.toLowerCase()))?.id ?? null) : null;

  for (const g of GOALS) {
    const holdingAccountId = findAccount(g.holding?.account);
    await prisma.savingsGoal.create({
      data: {
        name: g.name,
        icon: g.icon,
        jar: g.jar,
        priority: g.priority ?? 'NORMAL',
        ongoing: g.ongoing ?? false,
        targetAmount: BigInt(g.target),
        deadline: g.deadline ?? null,
        monthlyPlan: g.plan ? BigInt(g.plan.amount) : null,
        planDay: g.plan?.day ?? null,
        sourceAccountId: findAccount(g.plan?.source),
        holdingAccountId,
        // Không tìm thấy tài khoản trong web → ghi tên tự nhập
        holdingName: g.holding?.name ?? (g.holding?.account && !holdingAccountId ? g.holding.account : null),
        interestRateBp: g.rate !== undefined ? Math.round(g.rate * 100) : null,
        note: `${MARK} ${g.note ?? 'Tạo bởi npm run seed:goals'}`,
        createdAt: at(g.createdAt),
        completedAt: g.completedAt ? at(g.completedAt) : null,
        archivedAt: g.archivedAt ? at(g.archivedAt) : null,
        contributions: {
          create: g.history.map(([date, kind, amount, note]) => ({ kind, amount: BigInt(amount), date: at(date), note: note ?? null })),
        },
      },
    });
  }
  console.log(`✔ Đã tạo ${GOALS.length} mục tiêu mẫu${removed ? ` (thay ${removed} mục tiêu mẫu cũ)` : ''}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
