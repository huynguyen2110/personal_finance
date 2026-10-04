// Sinh ~6 tháng giao dịch giả (nguồn IMPORT) để xem thống kê trước khi có dữ liệu thật.
// Chạy lại nhiều lần an toàn: khóa externalId cố định nên giao dịch đã có sẽ bị bỏ qua.
// Dựng app context của Nest để dùng lại đúng các service (phân loại, ghép chuyển nội bộ…).
import '../src/common/utils/bigint-json.util';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AccountsService } from '../src/modules/finance/accounts/services/accounts.service';
import { CategorizeService } from '../src/modules/finance/rules/services/categorize.service';
import { TransfersService } from '../src/modules/finance/transfers/services/transfers.service';
import { findMatchingRule } from '../src/modules/finance/rules/utils/rule-engine';
import { addDaysStr, startOfVNDay, todayVN, weekdayOf } from '../src/common/utils/dates.util';

process.env.EMAIL_POLL_MINUTES = '0'; // không bật tự đọc email khi chạy seed

let app: INestApplicationContext;
let prisma: PrismaService;
let accounts: AccountsService;
let categorize: CategorizeService;
let transfers: TransfersService;

// PRNG cố định để dữ liệu giống nhau giữa các lần chạy
let seed = 20260929;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number, step = 1000) =>
  Math.round((min + rand() * (max - min)) / step) * step;

const ACCOUNT = '0123456789';
const BANK = 'MBBank';
const DAYS = 185;

interface Draft {
  date: string;
  time: string;
  type: 'in' | 'out';
  amount: number;
  content: string;
}

const FOOD = ['SHOPEEFOOD DH', 'GRABFOOD', 'HIGHLANDS COFFEE', 'PHUC LONG', 'QUAN AN CO BA', 'TRA SUA TOCOTOCO', 'KFC VIETNAM', 'NHA HANG LAU DE'];
const GROCERY = ['WINMART', 'BACH HOA XANH', 'CO.OPMART', 'CIRCLE K', 'AEON MALL'];
const SHOP = ['SHOPEE', 'LAZADA', 'TIKI', 'UNIQLO', 'THE GIOI DI DONG'];
const RIDE = ['GRAB', 'XANH SM', 'BE GROUP', 'PETROLIMEX XANG'];
const PEOPLE = ['NGUYEN VAN AN', 'TRAN THI BINH', 'LE MINH CUONG', 'PHAM THU DUNG'];

interface DemoTxn {
  externalId: string;
  bankName: string;
  accountNumber: string;
  direction: 'IN' | 'OUT';
  amount: number;
  content: string;
  at: string; // "YYYY-MM-DD HH:mm:ss" giờ VN
}

// Lưu giao dịch demo: tự phân loại theo quy tắc và tự ghép chuyển nội bộ như dữ liệu thật
async function importDemo(list: DemoTxn[]): Promise<{ created: number; skipped: number }> {
  const rules = await categorize.loadActiveRules();
  let created = 0;
  let skipped = 0;
  for (const d of list) {
    if (await prisma.transaction.findUnique({ where: { externalId: d.externalId }, select: { id: true } })) {
      skipped++;
      continue;
    }
    const account = await accounts.getOrCreateBankAccount(d.accountNumber, d.bankName);
    const rule = findMatchingRule(rules, d.content, d.direction);
    const t = await prisma.transaction.create({
      data: {
        accountId: account.id,
        externalId: d.externalId,
        source: 'IMPORT',
        direction: d.direction,
        amount: BigInt(d.amount),
        content: d.content,
        transactionDate: new Date(`${d.at.replace(' ', 'T')}+07:00`),
        categoryId: rule?.categoryId ?? null,
        categorizedBy: rule ? 'RULE' : 'NONE',
      },
      select: { id: true },
    });
    await transfers.detectTransferFor(t.id);
    created++;
  }
  return { created, skipped };
}

function hhmm(): string {
  const h = 7 + Math.floor(rand() * 15);
  const m = Math.floor(rand() * 60);
  const s = Math.floor(rand() * 60);
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

function buildDrafts(): Draft[] {
  const out: Draft[] = [];
  const today = todayVN();
  const start = addDaysStr(today, -DAYS);
  for (let i = 0; i <= DAYS; i++) {
    const date = addDaysStr(start, i);
    const day = Number(date.slice(8, 10));
    const month = Number(date.slice(5, 7));
    const weekday = weekdayOf(date);
    const weekend = weekday === 0 || weekday === 6;
    const add = (type: Draft['type'], amount: number, content: string) =>
      out.push({ date, time: hhmm(), type, amount, content });

    if (day === 5) add('in', 25_000_000, `CONG TY TNHH ABC TRA LUONG T${month}`);
    if (day === 1) add('out', 5_500_000, `CK TIEN NHA THANG ${month}`);
    if (day === 8) add('out', between(550_000, 950_000), `EVN HCMC THANH TOAN TIEN DIEN KY ${month}`);
    if (day === 9) add('out', 250_000, 'FPT TELECOM INTERNET');
    if (day === 12) add('out', 260_000, 'NETFLIX.COM');
    if (day === 15 && rand() < 0.5) add('in', between(500_000, 3_000_000, 100_000), `${pick(PEOPLE)} CHUYEN TIEN`);
    if (day === 20 && month % 3 === 0) add('in', 5_000_000, `THUONG QUY ${Math.ceil(month / 3)}`);
    if (day === 25) add('out', 2_000_000, 'CHUYEN TIEN CHO BO ME');
    if (day === 28) add('in', between(15_000, 40_000), 'TRA LAI TIEN GUI');

    // Ăn uống mỗi ngày
    const meals = weekend ? 2 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 2);
    for (let k = 0; k < meals; k++) add('out', between(35_000, weekend ? 350_000 : 150_000), pick(FOOD));

    if (rand() < (weekend ? 0.5 : 0.35)) add('out', between(25_000, 120_000), pick(RIDE));
    if (weekday === 6 || rand() < 0.12) add('out', between(200_000, 900_000), pick(GROCERY));
    if (rand() < 0.1) add('out', between(150_000, 1_500_000), `${pick(SHOP)} THANH TOAN DON HANG`);
    if (rand() < 0.04) add('out', between(80_000, 600_000), 'NHA THUOC LONG CHAU');
    if (weekend && rand() < 0.15) add('out', between(120_000, 400_000), 'CGV CINEMAS');
    if (rand() < 0.05) add('out', between(50_000, 500_000), `CK DEN ${pick(PEOPLE)}`); // chưa phân loại
    if (rand() < 0.02) add('in', between(50_000, 400_000), `SHOPEE HOAN TIEN DON HANG`);
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// Dữ liệu demo tạo từ phiên bản cũ (chưa có khóa "demo:*") → không tạo lại để tránh nhân đôi
async function hasLegacyDemo(accountNumber: string): Promise<boolean> {
  const n = await prisma.transaction.count({
    where: { account: { accountNumber }, source: 'IMPORT', externalId: null },
  });
  return n > 0;
}

async function main() {
  app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  prisma = app.get(PrismaService);
  accounts = app.get(AccountsService);
  categorize = app.get(CategorizeService);
  transfers = app.get(TransfersService);

  if (await hasLegacyDemo(ACCOUNT)) {
    console.log('• Demo: tài khoản demo đã có dữ liệu từ trước, bỏ qua');
    return;
  }
  const summary = await importDemo(
    buildDrafts().map((d, i) => ({
      externalId: `demo:${i}`,
      bankName: BANK,
      accountNumber: ACCOUNT,
      direction: d.type === 'in' ? 'IN' : 'OUT',
      amount: d.amount,
      content: d.content,
      at: `${d.date} ${d.time}`,
    }))
  );
  console.log(`✔ Demo: ${summary.created} giao dịch mới, ${summary.skipped} đã có (bỏ qua)`);

  await prisma.account.updateMany({
    where: { accountNumber: ACCOUNT, name: { startsWith: BANK } },
    data: { name: 'MB Bank (demo)' },
  });

  // Vài giao dịch tiền mặt
  const cash = await prisma.account.findFirst({ where: { type: 'CASH' } });
  if (cash && (await prisma.transaction.count({ where: { accountId: cash.id } })) === 0) {
    const food = await prisma.category.findFirst({ where: { name: 'Ăn uống' } });
    const today = todayVN();
    for (let i = 1; i <= 10; i++) {
      await prisma.transaction.create({
        data: {
          accountId: cash.id,
          source: 'MANUAL',
          direction: 'OUT',
          amount: BigInt(between(20_000, 80_000)),
          content: 'Ăn sáng (tiền mặt)',
          transactionDate: new Date(startOfVNDay(addDaysStr(today, -i * 3)).getTime() + 7.5 * 3600e3),
          categoryId: food?.id ?? null,
          categorizedBy: food ? 'MANUAL' : 'NONE',
        },
      });
    }
    await prisma.account.update({ where: { id: cash.id }, data: { openingBalance: BigInt(2_000_000) } });
    console.log('✔ Demo: 10 giao dịch tiền mặt');
  }

  await seedTransfers(cash?.id ?? null);

  // Ngân sách mặc định hàng tháng
  if ((await prisma.budget.count()) === 0) {
    const budgets: Record<string, number> = {
      'Ăn uống': 10_000_000,
      'Đi chợ / Siêu thị': 4_500_000,
      'Di chuyển': 1_800_000,
      'Nhà ở & Hóa đơn': 7_000_000,
      'Mua sắm': 3_000_000,
      'Giải trí': 1_200_000,
    };
    for (const [name, amount] of Object.entries(budgets)) {
      const cat = await prisma.category.findFirst({ where: { name, kind: 'EXPENSE' } });
      if (cat) await prisma.budget.create({ data: { categoryId: cat.id, month: '*', amount: BigInt(amount) } });
    }
    console.log('✔ Demo: ngân sách mặc định');
  }
}

// Chuyển khoản nội bộ demo (tự được ghép cặp khi lưu):
// - ngày 6 hàng tháng: MB → Techcombank tiết kiệm 3 triệu (hai phía cách nhau 40 giây)
// - ngày 18 hàng tháng: rút 1 triệu ở ATM MB, nhập tay khoản thu vào ví tiền mặt 4 phút sau
async function seedTransfers(cashId: number | null) {
  const TCB = '1903555566667777';
  const list: DemoTxn[] = [];
  const atmDates: string[] = [];
  const start = addDaysStr(todayVN(), -DAYS);
  for (let i = 0; i <= DAYS; i++) {
    const date = addDaysStr(start, i);
    const day = Number(date.slice(8, 10));
    if (day === 6) {
      list.push({ externalId: `demo-tf:${date}:out`, bankName: BANK, accountNumber: ACCOUNT, direction: 'OUT', amount: 3_000_000, content: 'CK SANG TCB TIET KIEM', at: `${date} 20:15:00` });
      list.push({ externalId: `demo-tf:${date}:in`, bankName: 'Techcombank', accountNumber: TCB, direction: 'IN', amount: 3_000_000, content: 'NHAN TIEN TU MB 0123456789 TIET KIEM', at: `${date} 20:15:40` });
    }
    if (day === 18) {
      list.push({ externalId: `demo-atm:${date}`, bankName: BANK, accountNumber: ACCOUNT, direction: 'OUT', amount: 1_000_000, content: 'RUT TIEN MAT ATM MB HOAN KIEM', at: `${date} 12:00:00` });
      atmDates.push(date);
    }
  }

  const summary = await importDemo(list);
  await prisma.account.updateMany({
    where: { accountNumber: TCB, name: { startsWith: 'Techcombank ••' } },
    data: { name: 'Techcombank tiết kiệm (demo)' },
  });

  let cashCreated = 0;
  if (cashId) {
    for (const date of atmDates) {
      const when = new Date(`${date}T12:04:00+07:00`);
      const exists = await prisma.transaction.findFirst({ where: { accountId: cashId, content: 'Rút tiền ATM', transactionDate: when } });
      if (exists) continue;
      const t = await prisma.transaction.create({
        data: { accountId: cashId, source: 'MANUAL', direction: 'IN', amount: BigInt(1_000_000), content: 'Rút tiền ATM', transactionDate: when },
      });
      await transfers.detectTransferFor(t.id);
      cashCreated++;
    }
  }
  console.log(`✔ Demo chuyển nội bộ: ${summary.created} giao dịch ngân hàng mới, ${cashCreated} khoản rút tiền mặt`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => app?.close());
