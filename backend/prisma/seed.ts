import { PrismaClient, type CategoryKind, type MatchType } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/utils/password.util';

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

// Danh mục cha (cấp cao nhất)
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

// Danh mục con: gắn vào cha cùng loại (tối đa 2 cấp). Tên phải khác nhau trong cùng loại thu/chi.
const SUB_CATEGORIES: { parent: string; name: string; kind: CategoryKind; icon: string; color: string }[] = [
  // Ăn uống
  { parent: 'Ăn uống', name: 'Cà phê & Trà sữa', kind: 'EXPENSE', icon: 'Coffee', color: C.orange },
  { parent: 'Ăn uống', name: 'Đặt món online', kind: 'EXPENSE', icon: 'Smartphone', color: C.orange },
  { parent: 'Ăn uống', name: 'Ăn ngoài / Nhà hàng', kind: 'EXPENSE', icon: 'UtensilsCrossed', color: C.orange },
  // Di chuyển
  { parent: 'Di chuyển', name: 'Xăng xe', kind: 'EXPENSE', icon: 'Fuel', color: C.blue },
  { parent: 'Di chuyển', name: 'Gọi xe / Taxi', kind: 'EXPENSE', icon: 'Car', color: C.blue },
  { parent: 'Di chuyển', name: 'Gửi xe & Phí đường', kind: 'EXPENSE', icon: 'Receipt', color: C.blue },
  // Nhà ở & Hóa đơn
  { parent: 'Nhà ở & Hóa đơn', name: 'Tiền nhà', kind: 'EXPENSE', icon: 'House', color: C.violet },
  { parent: 'Nhà ở & Hóa đơn', name: 'Điện nước', kind: 'EXPENSE', icon: 'Zap', color: C.violet },
  { parent: 'Nhà ở & Hóa đơn', name: 'Internet & Điện thoại', kind: 'EXPENSE', icon: 'Wifi', color: C.violet },
  // Mua sắm
  { parent: 'Mua sắm', name: 'Quần áo & Thời trang', kind: 'EXPENSE', icon: 'Shirt', color: C.magenta },
  { parent: 'Mua sắm', name: 'Đồ công nghệ', kind: 'EXPENSE', icon: 'Smartphone', color: C.magenta },
  { parent: 'Mua sắm', name: 'Mua sắm online', kind: 'EXPENSE', icon: 'ShoppingBag', color: C.magenta },
  // Giải trí
  { parent: 'Giải trí', name: 'Phim & Nhạc', kind: 'EXPENSE', icon: 'Clapperboard', color: C.yellow },
  { parent: 'Giải trí', name: 'Game', kind: 'EXPENSE', icon: 'Gamepad2', color: C.yellow },
  { parent: 'Giải trí', name: 'Du lịch', kind: 'EXPENSE', icon: 'Plane', color: C.yellow },
  // Sức khỏe
  { parent: 'Sức khỏe', name: 'Thuốc men', kind: 'EXPENSE', icon: 'Pill', color: C.red },
  { parent: 'Sức khỏe', name: 'Khám bệnh', kind: 'EXPENSE', icon: 'Stethoscope', color: C.red },
  { parent: 'Sức khỏe', name: 'Thể thao & Gym', kind: 'EXPENSE', icon: 'Dumbbell', color: C.red },
  // Giáo dục
  { parent: 'Giáo dục', name: 'Khóa học', kind: 'EXPENSE', icon: 'GraduationCap', color: C.green },
  { parent: 'Giáo dục', name: 'Sách', kind: 'EXPENSE', icon: 'BookOpen', color: C.green },
  // Lãi / Đầu tư
  { parent: 'Lãi / Đầu tư', name: 'Lãi tiết kiệm', kind: 'INCOME', icon: 'PiggyBank', color: C.green },
  { parent: 'Lãi / Đầu tư', name: 'Cổ tức', kind: 'INCOME', icon: 'TrendingUp', color: C.green },
];

// Từ khóa ngăn cách bằng dấu phẩy, khớp nguyên từ, không phân biệt dấu.
// Quy tắc gắn vào danh mục con khi có; cha chỉ giữ từ khóa chung.
const RULES: { category: string; pattern: string; matchType?: MatchType; priority?: number }[] = [
  { category: 'Lương', pattern: 'LUONG, SALARY, TRA LUONG, CHI LUONG', priority: 10 },
  { category: 'Thưởng', pattern: 'THUONG, BONUS', priority: 20 },
  { category: 'Hoàn tiền', pattern: 'HOAN TIEN, REFUND, HOAN TRA, CASHBACK', priority: 20 },
  // Ưu tiên 25 để thắng quy tắc chung của cha "Lãi / Đầu tư" (30) nếu DB cũ còn giữ
  { category: 'Lãi tiết kiệm', pattern: 'LAI TIEN GUI, TRA LAI, INTEREST', priority: 25 },
  { category: 'Cổ tức', pattern: 'CO TUC, DIVIDEND', priority: 25 },
  // Di chuyển
  { category: 'Gọi xe / Taxi', pattern: 'GRAB, BE GROUP, XANH SM, GOJEK, TAXI' },
  { category: 'Xăng xe', pattern: 'XANG, PETROLIMEX, PVOIL' },
  { category: 'Gửi xe & Phí đường', pattern: 'VETC, EPASS, GUI XE, PHI CAU DUONG' },
  // Ăn uống
  { category: 'Đặt món online', pattern: 'SHOPEEFOOD, GRABFOOD, BAEMIN, BEFOOD', priority: 90 },
  { category: 'Cà phê & Trà sữa', pattern: 'HIGHLANDS, PHUC LONG, STARBUCKS, CAFE, CA PHE, TRA SUA, KATINAT' },
  { category: 'Ăn ngoài / Nhà hàng', pattern: 'KFC, LOTTERIA, NHA HANG, QUAN AN, PIZZA, BUFFET' },
  { category: 'Đi chợ / Siêu thị', pattern: 'WINMART, BACH HOA XANH, BHX, COOPMART, CO.OPMART, LOTTE MART, AEON, GO!, CIRCLE K, FAMILYMART, 7-ELEVEN, SIEU THI' },
  // Mua sắm
  { category: 'Mua sắm online', pattern: 'SHOPEE, LAZADA, TIKI, TIKTOK SHOP' },
  { category: 'Quần áo & Thời trang', pattern: 'UNIQLO, ZARA, H&M, CANIFA' },
  { category: 'Đồ công nghệ', pattern: 'THE GIOI DI DONG, DIEN MAY XANH, FPT SHOP, CELLPHONES' },
  // Nhà ở & Hóa đơn
  { category: 'Tiền nhà', pattern: 'TIEN NHA, THUE NHA, PHI QUAN LY' },
  { category: 'Điện nước', pattern: 'EVN, TIEN DIEN, TIEN NUOC' },
  { category: 'Internet & Điện thoại', pattern: 'INTERNET, VNPT, VIETTEL, FPT TELECOM, NAP TIEN DIEN THOAI' },
  // Giải trí
  { category: 'Phim & Nhạc', pattern: 'NETFLIX, SPOTIFY, YOUTUBE, CGV, GALAXY, LOTTE CINEMA' },
  { category: 'Game', pattern: 'STEAM, APPLE.COM, GOOGLE PLAY' },
  { category: 'Du lịch', pattern: 'VIETJET, VIETNAM AIRLINES, BAMBOO, AGODA, BOOKING.COM, TRAVELOKA, KHACH SAN' },
  // Sức khỏe
  { category: 'Thuốc men', pattern: 'NHA THUOC, PHARMACITY, LONG CHAU, AN KHANG' },
  { category: 'Khám bệnh', pattern: 'BENH VIEN, PHONG KHAM, BAO HIEM' },
  { category: 'Thể thao & Gym', pattern: 'GYM, CALIFORNIA FITNESS, CITIGYM, YOGA' },
  // Giáo dục
  { category: 'Khóa học', pattern: 'HOC PHI, KHOA HOC, UDEMY, COURSERA' },
  { category: 'Sách', pattern: 'FAHASA, NHA SACH, TIKI BOOKS' },
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
  console.log(`✔ ${CATEGORIES.length} danh mục cha`);

  // Danh mục con: tạo mới nếu chưa có; nếu đã có (cùng tên, cùng loại) mà đang là cấp cao nhất và chưa có con → gắn vào cha
  let subCreated = 0;
  let subAttached = 0;
  for (const [j, s] of SUB_CATEGORIES.entries()) {
    const parent = await prisma.category.findUnique({ where: { name_kind: { name: s.parent, kind: s.kind } } });
    if (!parent) {
      console.warn(`⚠ Bỏ qua "${s.name}": không thấy danh mục cha "${s.parent}"`);
      continue;
    }
    const existing = await prisma.category.findUnique({
      where: { name_kind: { name: s.name, kind: s.kind } },
      include: { _count: { select: { children: true } } },
    });
    if (!existing) {
      await prisma.category.create({
        data: { name: s.name, kind: s.kind, icon: s.icon, color: s.color, parentId: parent.id, sortOrder: 100 + j },
      });
      subCreated++;
    } else if (existing.parentId === null && existing._count.children === 0 && existing.id !== parent.id) {
      await prisma.category.update({ where: { id: existing.id }, data: { parentId: parent.id } });
      subAttached++;
    }
  }
  console.log(`✔ ${SUB_CATEGORIES.length} danh mục con (tạo mới ${subCreated}, gắn vào cha ${subAttached})`);

  // Quy tắc: chỉ thêm quy tắc chưa có (cùng danh mục + cùng mẫu), không sửa/xóa quy tắc người dùng đã đặt.
  // Quy tắc của danh mục con mặc định ưu tiên 90 để chạy trước quy tắc chung của cha (100).
  {
    const cats = await prisma.category.findMany();
    const existing = await prisma.categoryRule.findMany({ select: { categoryId: true, pattern: true } });
    let created = 0;
    for (const r of RULES) {
      const cat = cats.find((c) => c.name === r.category);
      if (!cat) {
        console.warn(`⚠ Bỏ qua quy tắc "${r.pattern}": không thấy danh mục "${r.category}"`);
        continue;
      }
      if (existing.some((e) => e.categoryId === cat.id && e.pattern === r.pattern)) continue;
      await prisma.categoryRule.create({
        data: {
          pattern: r.pattern,
          matchType: r.matchType ?? 'CONTAINS',
          priority: r.priority ?? (cat.parentId !== null ? 90 : 100),
          categoryId: cat.id,
        },
      });
      created++;
    }
    console.log(`✔ Quy tắc phân loại: thêm ${created} (đã có sẵn ${existing.length})`);
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
