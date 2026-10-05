import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ContributionKind, GoalContribution, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import {
  addMonths,
  currentMonthVN,
  daysBetween,
  monthOfDate,
  monthOfDateVN,
  monthRange,
  todayVN,
  VN_OFFSET,
} from '../../../../common/utils/dates.util';
import { SettingsService } from '../../../../services/settings.service';
import { StatsService } from '../../stats/services/stats.service';
import { PlannedIncomeService } from '../../budgets/services/planned-income.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import type { CreateContributionDto, CreateGoalDto, UpdateGoalDto } from '../dto/goal.dto';
import {
  disciplineGrade,
  disciplineMonths,
  goalHorizon,
  goalStatus,
  EMERGENCY_TARGET_MONTHS,
  GOOD_SAVINGS_RATE,
  healthFactors,
  healthLevel,
  healthScore,
  monthDiff,
  monthsLeftUntil,
  projectMonth,
  simulateGoal,
} from '../utils/goal-insights';

// Mỗi mục tiêu là một "hũ" ảo: số đã tích lũy = tổng các lần nạp/rút/lãi đã ghi.
// Tiêu tiền của quỹ cho đúng mục đích (SPEND):
//  - quỹ một lần (VD mua điện thoại): không làm giảm tiến độ — đạt là xong, chỉ giảm số còn trong quỹ;
//  - quỹ duy trì (ongoing, VD quỹ khẩn cấp): tiến độ tính theo số còn trong quỹ → tiêu bớt thì quay lại tích lũy.
// Web không tự chuyển tiền; kế hoạch nạp định kỳ chỉ để nhắc và dự báo.

// Ảnh hưởng tới số đã tích lũy (tiến độ). SPEND = 0: tính riêng vào "đã tiêu".
const SIGN: Record<ContributionKind, 1 | -1 | 0> = { OPENING: 1, DEPOSIT: 1, INTEREST: 1, WITHDRAW: -1, SPEND: 0 };
// Tốc độ nạp thực tế tính trên 3 tháng gần nhất (kể cả tháng hiện tại)
const PACE_MONTHS = 3;
// Mốc an toàn của quỹ khẩn cấp: 3 tháng chi tiêu
const SAFETY_MILESTONE_MONTHS = 3;

type ContributionRow = Pick<GoalContribution, 'kind' | 'amount' | 'date' | 'transactionId'> & {
  transaction: { excludeFromStats: boolean } | null;
};

const goalInclude = {
  sourceAccount: { select: { id: true, name: true } },
  holdingAccount: { select: { id: true, name: true } },
  contributions: {
    select: { kind: true, amount: true, date: true, transactionId: true, transaction: { select: { excludeFromStats: true } } },
  },
} satisfies Prisma.SavingsGoalInclude;

type GoalWithRelations = Prisma.SavingsGoalGetPayload<{ include: typeof goalInclude }>;

// Nạp/rút ròng (bỏ số dư ban đầu và tiền lãi) — dùng để đo tốc độ và kỷ luật nạp
const netDeposit = (c: ContributionRow) => (c.kind === 'DEPOSIT' ? Number(c.amount) : c.kind === 'WITHDRAW' ? -Number(c.amount) : 0);
// Tiền để dành thêm trong kỳ: nạp + lãi − rút (bỏ số dư ban đầu và khoản tiêu)
const newSavings = (c: Pick<ContributionRow, 'kind' | 'amount'>) =>
  c.kind === 'DEPOSIT' || c.kind === 'INTEREST' ? Number(c.amount) : c.kind === 'WITHDRAW' ? -Number(c.amount) : 0;
const savedOf = (cs: Pick<ContributionRow, 'kind' | 'amount'>[]) => cs.reduce((s, c) => s + SIGN[c.kind] * Number(c.amount), 0);
const spentOf = (cs: Pick<ContributionRow, 'kind' | 'amount'>[]) =>
  cs.reduce((s, c) => s + (c.kind === 'SPEND' ? Number(c.amount) : 0), 0);

export type SpendStatus = 'unspent' | 'partial' | 'spent';

// Số tiền dùng để tính tiến độ / hoàn thành
const progressAmount = (ongoing: boolean, cs: Pick<ContributionRow, 'kind' | 'amount'>[]) =>
  ongoing ? Math.max(0, savedOf(cs) - spentOf(cs)) : savedOf(cs);

// Ngày nạp kế hoạch (ngày lịch `planDay`) rơi vào đâu trong tháng tài chính `month`:
// từ ngày bắt đầu tháng trở đi → tháng lịch này; nhỏ hơn → tháng lịch kế tiếp. Kẹp theo độ dài tháng lịch.
function planDateIn(month: string, planDay: number, startDay: number): string {
  const calMonth = planDay >= startDay ? month : addMonths(month, 1);
  const last = Number(monthRange(calMonth).to.slice(8));
  return `${calMonth}-${String(Math.min(planDay, last)).padStart(2, '0')}`;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly settings: SettingsService,
    private readonly plannedIncome: PlannedIncomeService,
    private readonly transactions: TransactionsService,
  ) {}

  // ─── Trang mục tiêu ───

  // Mọi mốc "tháng" theo tháng tài chính (ngày bắt đầu tháng trong cài đặt, VD ngày lương)
  async getPage() {
    const sd = await this.settings.monthStartDay();
    const month = currentMonthVN(sd);
    const today = todayVN();
    const range = monthRange(month, sd);
    const last3Range = { from: monthRange(addMonths(month, -3), sd).from, to: monthRange(addMonths(month, -1), sd).to };
    const [goals, avgMonthlyExpense, actualSummary, actualLast3, planned] = await Promise.all([
      this.prisma.savingsGoal.findMany({ include: goalInclude, orderBy: { id: 'asc' } }),
      this.avgMonthlyExpense(month, sd),
      this.stats.getSummary(range),
      // Tỷ lệ tiết kiệm trên 3 tháng đã trọn vẹn gần nhất
      this.stats.getSummary(last3Range),
      this.plannedIncome.isPlanned(),
    ]);
    // Chế độ chỉ lấy email tiền đi: thu nhập = hạn mức ngân sách + tiền tiết kiệm đã nạp trong tháng
    const [summary, last3] = planned
      ? await Promise.all([this.plannedIncome.applyToSummary(actualSummary, range, sd), this.plannedIncome.applyToSummary(actualLast3, last3Range, sd)])
      : [actualSummary, actualLast3];

    const views = goals.map((g) => this.toView(g, month, today, avgMonthlyExpense, sd));

    // Thặng dư tháng này còn chưa phân bổ vào mục tiêu nào.
    // Khoản nạp gắn với giao dịch vẫn đang tính là chi thì đã bị trừ trong "chi", không trừ lần nữa.
    const deposited = goals
      .flatMap((g) => g.contributions)
      .filter((c) => monthOfDateVN(c.date, sd) === month && (!c.transactionId || c.transaction?.excludeFromStats))
      .reduce((s, c) => s + netDeposit(c), 0);
    const available = summary.income - summary.expense - deposited;

    // Gợi ý: mục tiêu ưu tiên cao nhất có thể về đích ngay bằng phần thặng dư còn lại
    const rank = { HIGH: 0, NORMAL: 1, FLEXIBLE: 2 } as const;
    const candidate = views
      .filter((v) => !v.archivedAt && v.status !== 'done' && v.remaining > 0 && v.remaining <= available)
      .sort((a, b) => rank[a.priority] - rank[b.priority] || a.remaining - b.remaining)[0];

    const discipline = this.discipline(goals, month, today, sd);

    return {
      month,
      range,
      monthStartDay: sd,
      today,
      goals: views,
      avgMonthlyExpense,
      overview: this.overview(goals, views, month, avgMonthlyExpense, last3.savingsRate, discipline?.ratio ?? null, sd),
      surplus: {
        income: summary.income,
        expense: summary.expense,
        deposited,
        available,
        suggestion: candidate ? { goalId: candidate.id, amount: candidate.remaining } : null,
      },
      discipline,
    };
  }

  // Thống kê đầu trang: đang tiết kiệm bao nhiêu, phần quỹ duy trì, mục tiêu một lần, sức khỏe tài chính.
  // Chỉ tính mục tiêu chưa lưu trữ.
  private overview(
    goals: GoalWithRelations[],
    views: ReturnType<GoalsService['toView']>[],
    month: string,
    avgMonthlyExpense: number | null,
    savingsRate: number | null,
    disciplineRatio: number | null,
    sd: number,
  ) {
    const live = views.filter((v) => !v.archivedAt);
    const liveIds = new Set(live.map((v) => v.id));
    const contributions = goals.filter((g) => liveIds.has(g.id)).flatMap((g) => g.contributions);
    const savedIn = (m: string) => contributions.filter((c) => monthOfDateVN(c.date, sd) === m).reduce((s, c) => s + newSavings(c), 0);
    const sum = (xs: typeof live, f: (v: (typeof live)[number]) => number) => xs.reduce((s, v) => s + f(v), 0);

    const ongoing = live.filter((v) => v.ongoing);
    const oneTime = live.filter((v) => !v.ongoing && v.status !== 'done');
    const totalBalance = sum(live, (v) => v.balance);
    const ongoingBalance = sum(ongoing, (v) => v.balance);

    // Quỹ khẩn cấp đủ chi tiêu bao nhiêu tháng (hũ An toàn tài chính); chưa có quỹ nào thì là 0 tháng
    const safetyBalance = sum(live.filter((v) => v.jar === 'SAFETY'), (v) => v.balance);
    const emergencyMonths = avgMonthlyExpense ? safetyBalance / avgMonthlyExpense : null;

    // Mục tiêu có hạn: bao nhiêu cái đang đúng lộ trình
    const tracked = live.filter((v) => v.status === 'on_track' || v.status === 'behind' || v.status === 'overdue');
    const onTrack = { ok: tracked.filter((v) => v.status === 'on_track').length, total: tracked.length };

    const factors = healthFactors({ emergencyMonths, savingsRate, disciplineRatio, onTrack });
    const score = healthScore(factors);

    return {
      totalBalance,
      totalSaved: sum(live, (v) => v.saved),
      totalSpent: sum(live, (v) => v.spent),
      savedThisMonth: savedIn(month),
      savedLastMonth: savedIn(addMonths(month, -1)),
      ongoing: {
        count: ongoing.length,
        balance: ongoingBalance,
        target: sum(ongoing, (v) => v.targetAmount),
        share: totalBalance > 0 ? ongoingBalance / totalBalance : 0,
        // Cần nạp bù cho đầy các quỹ duy trì
        refill: sum(ongoing, (v) => v.remaining),
      },
      oneTime: {
        count: oneTime.length,
        current: sum(oneTime, (v) => v.current),
        target: sum(oneTime, (v) => v.targetAmount),
        done: live.filter((v) => !v.ongoing && v.status === 'done').length,
      },
      statusCounts: {
        on_track: live.filter((v) => v.status === 'on_track').length,
        behind: live.filter((v) => v.status === 'behind').length,
        overdue: live.filter((v) => v.status === 'overdue').length,
      },
      health: {
        score,
        level: score === null ? null : healthLevel(score),
        factors: factors.map((f) => ({ ...f })),
        emergencyMonths,
        emergencyTargetMonths: EMERGENCY_TARGET_MONTHS,
        savingsRate,
        goodSavingsRate: GOOD_SAVINGS_RATE,
        disciplineRatio,
        onTrack,
      },
    };
  }

  private toView(g: GoalWithRelations, month: string, today: string, avgMonthlyExpense: number | null, sd: number) {
    const target = Number(g.targetAmount);
    const saved = savedOf(g.contributions);
    // Đã tiêu cho mục đích của quỹ, và số tiền thực còn nằm trong quỹ
    const spent = spentOf(g.contributions);
    const balance = Math.max(0, saved - spent);
    // Số tính tiến độ: quỹ duy trì = số còn trong quỹ, quỹ một lần = số đã tích lũy
    const current = g.ongoing ? balance : saved;
    const remaining = Math.max(0, target - current);
    const spendStatus: SpendStatus = spent <= 0 ? 'unspent' : balance > 0 ? 'partial' : 'spent';
    const spendDates = g.contributions.filter((c) => c.kind === 'SPEND').map((c) => c.date.getTime());
    const interestRate = g.interestRateBp !== null ? g.interestRateBp / 100 : null;
    const monthlyPlan = g.monthlyPlan !== null ? Number(g.monthlyPlan) : null;

    // Tốc độ nạp thực tế: trung bình các tháng gần nhất kể từ khi tạo mục tiêu
    const createdMonth = monthOfDateVN(g.createdAt, sd);
    const paceFrom = createdMonth > addMonths(month, -(PACE_MONTHS - 1)) ? createdMonth : addMonths(month, -(PACE_MONTHS - 1));
    const paceMonths = Math.max(1, monthDiff(paceFrom, month) + 1);
    const paceNet = g.contributions.filter((c) => monthOfDateVN(c.date, sd) >= paceFrom).reduce((s, c) => s + netDeposit(c), 0);
    const pace = Math.max(0, Math.round(paceNet / paceMonths));

    // Dự báo theo kế hoạch nạp nếu có, không thì theo tốc độ thực tế
    const monthlyRate = monthlyPlan && monthlyPlan > 0 ? monthlyPlan : pace;
    const sim = simulateGoal(current, target, monthlyRate, interestRate);
    const projectedMonth = remaining === 0 ? null : projectMonth(month, sim.months);
    // Hạn là một ngày; số tháng còn lại/dự báo tính theo tháng (tài chính) chứa ngày đó
    const deadlineMonth = g.deadline ? monthOfDate(g.deadline, sd) : null;
    const status = goalStatus({ saved: current, target, deadline: g.deadline, deadlineMonth, today, projectedMonth, monthlyRate });
    const notPassed = !!g.deadline && g.deadline >= today;
    const monthsLeft = notPassed && deadlineMonth ? monthsLeftUntil(month, deadlineMonth) : null;

    // Kế hoạch tháng này: đã nạp bao nhiêu, còn thiếu bao nhiêu, đã tới ngày nạp chưa
    const depositedThisMonth = g.contributions.filter((c) => monthOfDateVN(c.date, sd) === month).reduce((s, c) => s + netDeposit(c), 0);
    // Ngày nạp kế hoạch của tháng (tài chính) này
    const planDate = g.planDay ? planDateIn(month, g.planDay, sd) : null;
    const due = monthlyPlan && status !== 'done' ? Math.max(0, Math.min(monthlyPlan, remaining) - Math.max(0, depositedThisMonth)) : 0;

    // Quỹ khẩn cấp: mốc an toàn 3 tháng chi tiêu, và số tháng chi tiêu đã đủ
    const isSafety = g.jar === 'SAFETY' && avgMonthlyExpense !== null && avgMonthlyExpense > 0;
    const milestoneAmount = isSafety ? Math.round(avgMonthlyExpense * SAFETY_MILESTONE_MONTHS) : null;

    const dates = g.contributions.map((c) => c.date.getTime());

    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      jar: g.jar,
      priority: g.priority,
      ongoing: g.ongoing,
      targetAmount: target,
      deadline: g.deadline,
      deadlineMonth,
      // Số ngày tới hạn (0 = hôm nay); null = không đặt hạn hoặc đã qua
      daysLeft: notPassed ? daysBetween(today, g.deadline!) - 1 : null,
      monthlyPlan,
      planDay: g.planDay,
      sourceAccount: g.sourceAccount,
      holdingAccount: g.holdingAccount,
      holdingName: g.holdingName,
      interestRate,
      note: g.note,
      completedAt: g.completedAt,
      archivedAt: g.archivedAt,
      createdAt: g.createdAt,

      saved,
      current,
      remaining,
      progress: target > 0 ? current / target : 0,
      spent,
      balance,
      spendStatus,
      lastSpentAt: spendDates.length ? new Date(Math.max(...spendDates)) : null,
      contributionCount: g.contributions.length,
      lastContributionAt: dates.length ? new Date(Math.max(...dates)) : null,

      pace,
      monthlyRate,
      projectedMonth,
      projectedMonths: remaining === 0 ? 0 : sim.months,
      monthsLeft,
      // Cần nạp mỗi tháng (không tính lãi) để kịp hạn
      requiredMonthly: monthsLeft ? Math.ceil(remaining / monthsLeft) : null,
      status,
      horizon: status === 'done' ? null : goalHorizon(month, deadlineMonth, sim.months),

      // Lãi tính trên số tiền thực còn trong quỹ
      monthlyInterest: interestRate ? Math.round((balance * interestRate) / 100 / 12) : 0,
      interestToFinish: remaining > 0 && sim.months !== null ? sim.interest : 0,

      thisMonth: {
        deposited: depositedThisMonth,
        due,
        planDate,
        dueNow: due > 0 && (planDate === null || today >= planDate),
      },
      milestone:
        milestoneAmount !== null && milestoneAmount < target
          ? { amount: milestoneAmount, label: `Mốc an toàn ${SAFETY_MILESTONE_MONTHS} tháng chi tiêu`, reached: current >= milestoneAmount }
          : null,
      coverMonths: isSafety ? balance / avgMonthlyExpense : null,
    };
  }

  // Chi tiêu trung bình/tháng của 6 tháng đã qua (chỉ tính tháng có phát sinh chi)
  private async avgMonthlyExpense(month: string, sd: number): Promise<number | null> {
    const points = await this.stats.getMonthly({
      from: monthRange(addMonths(month, -6), sd).from,
      to: monthRange(addMonths(month, -1), sd).to,
      monthStartDay: sd,
    });
    const withExpense = points.filter((p) => p.expense > 0);
    if (!withExpense.length) return null;
    return Math.round(withExpense.reduce((s, p) => s + p.expense, 0) / withExpense.length);
  }

  // Kỷ luật nạp: thực nạp / kế hoạch, trên các mục tiêu có kế hoạch nạp định kỳ, tối đa 3 tháng gần nhất
  private discipline(goals: GoalWithRelations[], month: string, today: string, sd: number) {
    let planned = 0;
    let actual = 0;
    let goalCount = 0;
    for (const g of goals) {
      if (!g.monthlyPlan || g.monthlyPlan <= 0n || g.archivedAt) continue;
      // Đã đạt trước kỳ chấm thì không cần nạp nữa
      if (g.completedAt && monthOfDateVN(g.completedAt, sd) < addMonths(month, -3)) continue;
      // Chưa có ngày nạp → tính tới hết tháng (tài chính)
      const planDate = g.planDay ? planDateIn(month, g.planDay, sd) : monthRange(month, sd).to;
      const months = disciplineMonths(monthOfDateVN(g.createdAt, sd), month, today >= planDate);
      if (!months.length) continue;
      goalCount++;
      planned += Number(g.monthlyPlan) * months.length;
      actual += g.contributions.filter((c) => months.includes(monthOfDateVN(c.date, sd))).reduce((s, c) => s + netDeposit(c), 0);
    }
    if (planned <= 0) return null;
    const ratio = Math.max(0, actual / planned);
    return { grade: disciplineGrade(ratio), ratio, planned, actual, goals: goalCount };
  }

  // ─── CRUD mục tiêu ───

  private toData(dto: UpdateGoalDto): Prisma.SavingsGoalUncheckedUpdateInput {
    const data: Prisma.SavingsGoalUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.jar !== undefined) data.jar = dto.jar;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.ongoing !== undefined) data.ongoing = dto.ongoing;
    if (dto.targetAmount !== undefined) data.targetAmount = BigInt(dto.targetAmount);
    if (dto.deadline !== undefined) data.deadline = dto.deadline || null;
    if (dto.monthlyPlan !== undefined) data.monthlyPlan = dto.monthlyPlan ? BigInt(dto.monthlyPlan) : null;
    if (dto.planDay !== undefined) data.planDay = dto.planDay ?? null;
    if (dto.sourceAccountId !== undefined) data.sourceAccountId = dto.sourceAccountId ?? null;
    if (dto.holdingAccountId !== undefined) data.holdingAccountId = dto.holdingAccountId ?? null;
    if (dto.holdingName !== undefined) data.holdingName = dto.holdingName || null;
    if (dto.interestRate !== undefined) data.interestRateBp = dto.interestRate !== null ? Math.round(dto.interestRate * 100) : null;
    if (dto.note !== undefined) data.note = dto.note || null;
    return data;
  }

  private async assertAccounts(dto: UpdateGoalDto) {
    const ids = [dto.sourceAccountId, dto.holdingAccountId].filter((x): x is number => typeof x === 'number');
    if (!ids.length) return;
    const found = await this.prisma.account.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) throw new BadRequestException('Tài khoản không tồn tại');
  }

  async create(dto: CreateGoalDto) {
    await this.assertAccounts(dto);
    const { initialAmount, ...rest } = dto;
    const goal = await this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: BigInt(dto.targetAmount),
        icon: 'PiggyBank',
        jar: 'OTHER',
        priority: 'NORMAL',
        // Quỹ khẩn cấp mặc định là quỹ duy trì
        ongoing: dto.jar === 'SAFETY',
        ...(this.toData(rest) as unknown as Partial<Prisma.SavingsGoalUncheckedCreateInput>),
        contributions: initialAmount
          ? { create: { kind: 'OPENING', amount: BigInt(initialAmount), date: new Date(), note: 'Số tiền đã có khi tạo mục tiêu' } }
          : undefined,
      },
    });
    await this.syncCompletion(goal.id);
    return { id: goal.id };
  }

  async update(id: number, dto: UpdateGoalDto) {
    await this.assertAccounts(dto);
    await this.prisma.savingsGoal.update({ where: { id }, data: this.toData(dto) });
    await this.syncCompletion(id);
    return { ok: true };
  }

  async archive(id: number, archived: boolean) {
    await this.prisma.savingsGoal.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    return { ok: true };
  }

  // Xóa mục tiêu: trả các giao dịch đã bị web loại khỏi thống kê về như cũ
  async remove(id: number) {
    const linked = await this.prisma.goalContribution.findMany({
      where: { goalId: id, excludedTxn: true, transactionId: { not: null } },
      select: { transactionId: true },
    });
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({
        where: { id: { in: linked.map((l) => l.transactionId!) }, transferPairId: null },
        data: { excludeFromStats: false },
      }),
      this.prisma.savingsGoal.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  // Đánh dấu hoàn thành khi số đã tích lũy chạm mục tiêu; tụt xuống dưới (rút tiền, tăng mục tiêu) thì bỏ đánh dấu
  private async syncCompletion(goalId: number) {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { id: goalId },
      select: { targetAmount: true, ongoing: true, completedAt: true, contributions: { select: { kind: true, amount: true } } },
    });
    if (!goal) return;
    const reached = progressAmount(goal.ongoing, goal.contributions) >= Number(goal.targetAmount);
    if (reached && !goal.completedAt) {
      await this.prisma.savingsGoal.update({ where: { id: goalId }, data: { completedAt: new Date() } });
    } else if (!reached && goal.completedAt) {
      await this.prisma.savingsGoal.update({ where: { id: goalId }, data: { completedAt: null } });
    }
  }

  // ─── Nạp / rút ───

  async listContributions(goalId: number) {
    await this.prisma.savingsGoal.findUniqueOrThrow({ where: { id: goalId }, select: { id: true } });
    const rows = await this.prisma.goalContribution.findMany({
      where: { goalId },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: {
        transaction: {
          select: { id: true, content: true, transactionDate: true, direction: true, account: { select: { id: true, name: true } } },
        },
      },
    });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
  }

  async addContribution(goalId: number, dto: CreateContributionDto) {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { id: goalId },
      select: { id: true, contributions: { select: { kind: true, amount: true } } },
    });
    if (!goal) throw new NotFoundException('Không tìm thấy mục tiêu');

    // Chi tiêu từ quỹ → bắt buộc gắn với một khoản chi (đã ghi nhận, hoặc tạo mới) được tính vào thống kê chi tiêu
    const spend = dto.kind === 'SPEND';
    if (dto.newTransaction && !spend) throw new BadRequestException('Chỉ chi tiêu từ quỹ mới tạo kèm giao dịch chi mới');
    if (spend && !dto.transactionId === !dto.newTransaction) {
      throw new BadRequestException('Chi tiêu từ quỹ phải gắn với giao dịch chi: chọn giao dịch đã ghi nhận hoặc tạo giao dịch mới');
    }

    let txn: { id: number; amount: bigint; transactionDate: Date; excludeFromStats: boolean; direction: string } | null = null;
    if (dto.transactionId) {
      txn = await this.prisma.transaction.findUnique({
        where: { id: dto.transactionId },
        select: { id: true, amount: true, transactionDate: true, excludeFromStats: true, direction: true, goalContribution: { select: { id: true } } },
      }).then((t) => {
        if (!t) throw new BadRequestException('Giao dịch không tồn tại');
        if (t.goalContribution) throw new BadRequestException('Giao dịch này đã được gắn với một lần nạp/rút khác');
        return t;
      });
      if (spend && txn?.direction !== 'OUT') throw new BadRequestException('Chi tiêu từ quỹ phải gắn với một giao dịch chi (tiền ra)');
      if (spend && txn?.excludeFromStats) throw new BadRequestException('Giao dịch này đang bị loại khỏi thống kê, không dùng cho chi tiêu từ quỹ được');
    }

    const amount = dto.amount ?? (txn ? Number(txn.amount) : 0);
    if (amount <= 0) throw new BadRequestException('Nhập số tiền');
    if (dto.kind === 'WITHDRAW' || dto.kind === 'SPEND') {
      const balance = savedOf(goal.contributions) - spentOf(goal.contributions);
      if (amount > balance) {
        throw new BadRequestException(
          dto.kind === 'SPEND' ? 'Số tiền tiêu lớn hơn số còn trong quỹ' : 'Số tiền rút lớn hơn số còn trong quỹ',
        );
      }
    }

    // Ngày: theo giao dịch gắn kèm; hôm nay → thời điểm hiện tại; ngày khác → 12:00 ngày đó
    const date = dto.date
      ? dto.date === todayVN()
        ? new Date()
        : new Date(`${dto.date}T12:00:00${VN_OFFSET}`)
      : (txn?.transactionDate ?? new Date());
    if (date.getTime() > Date.now() + 60_000) throw new BadRequestException('Không ghi nạp/rút cho ngày trong tương lai');

    // Khoản chi của lần chi tiêu từ quỹ luôn tính vào thống kê → không bao giờ loại ra
    const excludeTxn = !spend && !!txn && !!dto.excludeFromStats && !txn.excludeFromStats;

    // Chưa có giao dịch chi → tạo khoản chi nhập tay (số tiền, ngày theo lần chi tiêu)
    let createdTxnId: number | null = null;
    if (dto.newTransaction) {
      const created = await this.transactions.create({
        accountId: dto.newTransaction.accountId,
        direction: 'OUT',
        amount,
        content: dto.newTransaction.content,
        transactionDate: date.toISOString(),
        categoryId: dto.newTransaction.categoryId ?? null,
        note: dto.note || null,
        excludeFromStats: false,
      });
      createdTxnId = created.id;
    }

    try {
      await this.prisma.$transaction([
        ...(excludeTxn ? [this.prisma.transaction.update({ where: { id: txn!.id }, data: { excludeFromStats: true } })] : []),
        this.prisma.goalContribution.create({
          data: {
            goalId,
            kind: dto.kind,
            amount: BigInt(amount),
            date,
            note: dto.note || null,
            transactionId: createdTxnId ?? txn?.id ?? null,
            excludedTxn: excludeTxn,
            createdTxn: createdTxnId !== null,
          },
        }),
      ]);
    } catch (e) {
      // Không ghi được → bỏ luôn khoản chi vừa tạo để không còn giao dịch mồ côi
      if (createdTxnId !== null) await this.prisma.transaction.delete({ where: { id: createdTxnId } }).catch(() => {});
      throw e;
    }
    await this.syncCompletion(goalId);
    return { ok: true };
  }

  async removeContribution(id: number) {
    const c = await this.prisma.goalContribution.findUniqueOrThrow({
      where: { id },
      select: { goalId: true, transactionId: true, excludedTxn: true, createdTxn: true },
    });
    await this.prisma.$transaction([
      ...(c.excludedTxn && c.transactionId
        ? [this.prisma.transaction.updateMany({ where: { id: c.transactionId, transferPairId: null }, data: { excludeFromStats: false } })]
        : []),
      this.prisma.goalContribution.delete({ where: { id } }),
      // Khoản chi do chính lần ghi này tạo ra → xóa theo
      ...(c.createdTxn && c.transactionId ? [this.prisma.transaction.deleteMany({ where: { id: c.transactionId } })] : []),
    ]);
    await this.syncCompletion(c.goalId);
    return { ok: true };
  }

  // Giao dịch 90 ngày gần nhất chưa gắn với lần nạp/rút nào (để chọn khi ghi nạp/rút)
  async linkableTransactions(direction?: 'IN' | 'OUT') {
    const since = new Date(Date.now() - 90 * 86400000);
    const rows = await this.prisma.transaction.findMany({
      where: { transactionDate: { gte: since }, goalContribution: null, ...(direction ? { direction } : {}) },
      orderBy: { transactionDate: 'desc' },
      take: 50,
      select: {
        id: true,
        direction: true,
        amount: true,
        content: true,
        transactionDate: true,
        excludeFromStats: true,
        account: { select: { id: true, name: true } },
      },
    });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
  }
}
