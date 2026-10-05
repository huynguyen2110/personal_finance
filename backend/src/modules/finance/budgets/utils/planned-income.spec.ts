import { depositedSavingsFor, incomeMonthsIn } from './planned-income';

const at = (date: string) => new Date(`${date}T10:00:00+07:00`);

describe('planned-income', () => {
  it('depositedSavingsFor: nạp − rút trong tháng, bỏ số dư ban đầu / lãi / khoản tiêu', () => {
    const cs = [
      { kind: 'OPENING', amount: 50_000_000n, date: at('2026-10-06') },
      { kind: 'DEPOSIT', amount: 10_000_000n, date: at('2026-10-06') },
      { kind: 'DEPOSIT', amount: 2_000_000n, date: at('2026-10-20') },
      { kind: 'WITHDRAW', amount: 3_000_000n, date: at('2026-10-21') },
      { kind: 'INTEREST', amount: 40_000n, date: at('2026-10-25') },
      { kind: 'SPEND', amount: 12_000_000n, date: at('2026-10-26') },
      { kind: 'DEPOSIT', amount: 10_000_000n, date: at('2026-09-10') },
    ];
    expect(depositedSavingsFor(cs, '2026-10', 1)).toBe(9_000_000);
    expect(depositedSavingsFor(cs, '2026-09', 1)).toBe(10_000_000);
    expect(depositedSavingsFor(cs, '2026-08', 1)).toBe(0);
  });

  it('depositedSavingsFor: theo tháng tài chính, rút nhiều hơn nạp thì 0', () => {
    // Ngày bắt đầu tháng 5: 03/10 thuộc tháng tài chính 2026-09 (05/09 → 04/10)
    expect(depositedSavingsFor([{ kind: 'DEPOSIT', amount: 1_000_000n, date: at('2026-10-03') }], '2026-09', 5)).toBe(1_000_000);
    expect(
      depositedSavingsFor(
        [
          { kind: 'DEPOSIT', amount: 1_000_000n, date: at('2026-10-10') },
          { kind: 'WITHDRAW', amount: 5_000_000n, date: at('2026-10-11') },
        ],
        '2026-10',
        5,
      ),
    ).toBe(0);
  });

  it('incomeMonthsIn: tháng nào có ngày đầu tháng nằm trong kỳ', () => {
    expect(incomeMonthsIn('2026-10-05', '2026-10-05', 5)).toEqual(['2026-10']); // tháng này tính tới hôm nay = ngày lương
    expect(incomeMonthsIn('2026-10-06', '2026-10-20', 5)).toEqual([]); // kỳ giữa tháng: không có ngày lương
    expect(incomeMonthsIn('2026-08-05', '2026-10-10', 5)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(incomeMonthsIn('2026-01-01', '2026-03-31', 1)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});
