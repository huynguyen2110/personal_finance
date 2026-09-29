import { PrismaClient, type CategoryKind, type MatchType } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';

const prisma = new PrismaClient();

// Màu nhận diện danh mục (chip/icon) — lấy từ bảng màu categorical của dataviz
const C = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  magenta: '#e87ba4',
  green: '#008300',
  violet: '#4a3aa7',
  red: '#e34948',
  gray: '#898781',
};

const CATEGORIES: { name: string; kind: CategoryKind; icon: string; color: string }[] = [
  { name: 'Ăn uống', kind: 'EXPENSE', icon: 'UtensilsCrossed', color: C.orange },
  { name: 'Đi chợ / Siêu thị', kind: 'EXPENSE', icon: 'ShoppingBasket', color: C.aqua },
  { name: 'Di chuyển', kind: 'EXPENSE', icon: 'Car', color: C.blue },
  { name: 'Nhà ở & Hóa đơn', kind: 'EXPENSE', icon: 'House', color: C.violet },
  { name: 'Mua sắm', kind: 'EXPENSE', icon: 'ShoppingBag', color: C.magenta },
  { name: 'Giải trí', kind: 'EXPENSE', icon: 'Clapperboard', color: C.yellow },
  { name: 'Sức khỏe', kind: 'EXPENSE', icon: 'HeartPulse', color: C.red },
  { name: 'Giáo dục', kind: 'EXPENSE', icon: 'GraduationCap', color: C.green },
  { name: 'Gia đình & Quà', kind: 'EXPENSE', icon: 'Gift', color: C.magenta },
  { name: 'Chi khác', kind: 'EXPENSE', icon: 'Ellipsis', color: C.gray },
  { name: 'Lương', kind: 'INCOME', icon: 'Briefcase', color: C.blue },
  { name: 'Thưởng', kind: 'INCOME', icon: 'Award', color: C.yellow },
  { name: 'Được chuyển tiền', kind: 'INCOME', icon: 'HandCoins', color: C.aqua },
  { name: 'Hoàn tiền', kind: 'INCOME', icon: 'RotateCcw', color: C.violet },
  { name: 'Lãi / Đầu tư', kind: 'INCOME', icon: 'TrendingUp', color: C.green },
  { name: 'Thu khác', kind: 'INCOME', icon: 'Ellipsis', color: C.gray },
];

// Từ khóa ngăn cách bằng dấu phẩy, khớp nguyên từ, không phân biệt dấu
const RULES: { category: string; pattern: string; matchType?: MatchType; priority?: number }[] = [
  { category: 'Lương', pattern: 'LUONG, SALARY, TRA LUONG, CHI LUONG', priority: 10 },
  { category: 'Thưởng', pattern: 'THUONG, BONUS', priority: 20 },
  { category: 'Hoàn tiền', pattern: 'HOAN TIEN, REFUND, HOAN TRA, CASHBACK', priority: 20 },
  { category: 'Lãi / Đầu tư', pattern: 'LAI TIEN GUI, TRA LAI, INTEREST, CO TUC', priority: 30 },
  { category: 'Di chuyển', pattern: 'GRAB, BE GROUP, XANH SM, GOJEK, XANG, PETROLIMEX, VETC, EPASS, GUI XE, TAXI' },
  { category: 'Ăn uống', pattern: 'SHOPEEFOOD, GRABFOOD, BAEMIN, HIGHLANDS, PHUC LONG, STARBUCKS, KFC, LOTTERIA, CAFE, CA PHE, TRA SUA, NHA HANG, QUAN AN' },
  { category: 'Đi chợ / Siêu thị', pattern: 'WINMART, BACH HOA XANH, BHX, COOPMART, CO.OPMART, LOTTE MART, AEON, GO!, CIRCLE K, FAMILYMART, 7-ELEVEN, SIEU THI' },
  { category: 'Mua sắm', pattern: 'SHOPEE, LAZADA, TIKI, TIKTOK SHOP, UNIQLO, THE GIOI DI DONG, DIEN MAY XANH, FPT SHOP' },
  { category: 'Nhà ở & Hóa đơn', pattern: 'EVN, TIEN DIEN, TIEN NUOC, INTERNET, VNPT, VIETTEL, FPT TELECOM, TIEN NHA, THUE NHA, PHI QUAN LY, NAP TIEN DIEN THOAI' },
  { category: 'Giải trí', pattern: 'NETFLIX, SPOTIFY, YOUTUBE, CGV, GALAXY, LOTTE CINEMA, STEAM, APPLE.COM' },
  { category: 'Sức khỏe', pattern: 'NHA THUOC, PHARMACITY, LONG CHAU, BENH VIEN, PHONG KHAM, BAO HIEM' },
  { category: 'Giáo dục', pattern: 'HOC PHI, KHOA HOC, UDEMY, COURSERA, FAHASA' },
];

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Cần đặt ADMIN_PASSWORD trong .env trước khi seed');

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash: await hashPassword(password) },
  });
  console.log(`✔ Người dùng: ${username}`);

  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { name_kind: { name: c.name, kind: c.kind } },
      update: {},
      create: { ...c, isSystem: true, sortOrder: i },
    });
  }
  console.log(`✔ ${CATEGORIES.length} danh mục`);

  if ((await prisma.categoryRule.count()) === 0) {
    const cats = await prisma.category.findMany();
    for (const r of RULES) {
      const cat = cats.find((c) => c.name === r.category);
      if (!cat) continue;
      await prisma.categoryRule.create({
        data: {
          pattern: r.pattern,
          matchType: r.matchType ?? 'CONTAINS',
          priority: r.priority ?? 100,
          categoryId: cat.id,
        },
      });
    }
    console.log(`✔ ${RULES.length} quy tắc phân loại`);
  }

  if ((await prisma.account.count({ where: { type: 'CASH' } })) === 0) {
    await prisma.account.create({ data: { type: 'CASH', name: 'Tiền mặt' } });
    console.log('✔ Ví tiền mặt');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
