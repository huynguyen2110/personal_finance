'use client';

import { useMemo } from 'react';
import { Landmark, Wallet, WalletCards } from 'lucide-react';
import type { AccountDTO } from '@/modules/finance/accounts/types';
import TreeSelect, { type TreeOption } from './TreeSelect';

// Chỉ cần vài trường để dựng lựa chọn, nên các DTO rút gọn cũng dùng được
export type AccountLike = Pick<AccountDTO, 'id' | 'name' | 'type'> & Partial<Pick<AccountDTO, 'bankName' | 'isActive'>>;

interface Props {
  accounts: AccountLike[];
  value: number | null;
  onChange: (id: number | null) => void;
  // Nhãn của lựa chọn "không chọn tài khoản nào" (VD "Tất cả tài khoản"); bỏ trống = bắt buộc chọn
  allLabel?: string;
  // Thêm lựa chọn ở cuối (VD "Khác (tự nhập)…")
  extra?: TreeOption<number>[];
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  id?: string;
  placeholder?: string;
}

// Icon vuông nhỏ: ngân hàng (xanh) / tiền mặt (lục)
export function AccountIcon({ type, size = 'sm' }: { type: AccountLike['type']; size?: 'sm' | 'md' }) {
  const Icon = type === 'CASH' ? Wallet : Landmark;
  const tone = type === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700';
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg';
  const ic = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span className={`${box} inline-flex items-center justify-center shrink-0 ${tone}`} aria-hidden>
      <Icon className={ic} />
    </span>
  );
}

// Giá trị nội bộ cho lựa chọn "tất cả / không chọn"
const ALL = 0;

// Dropdown chọn tài khoản: icon theo loại, tài khoản tạm ngưng xếp cuối với nhãn phụ
export default function AccountSelect({
  accounts,
  value,
  onChange,
  allLabel,
  extra,
  size = 'md',
  disabled,
  className,
  ariaLabel = 'Tài khoản',
  id,
  placeholder = 'Chọn tài khoản…',
}: Props) {
  const options = useMemo<TreeOption<number>[]>(() => {
    const toOpt = (a: AccountLike): TreeOption<number> => ({
      value: a.id,
      label: a.name,
      icon: <AccountIcon type={a.type} />,
      keywords: a.bankName ?? undefined,
      meta: a.isActive === false ? 'tạm ngưng' : undefined,
    });
    const active = accounts.filter((a) => a.isActive !== false).map(toOpt);
    const inactive = accounts.filter((a) => a.isActive === false).map(toOpt);
    return [
      ...(allLabel
        ? [
            {
              value: ALL,
              label: allLabel,
              icon: (
                <span className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-slate-100 text-slate-500" aria-hidden>
                  <WalletCards className="w-3.5 h-3.5" />
                </span>
              ),
            },
          ]
        : []),
      ...active,
      ...inactive,
      ...(extra ?? []),
    ];
  }, [accounts, allLabel, extra]);

  return (
    <TreeSelect<number>
      options={options}
      value={value ?? (allLabel ? ALL : null)}
      onChange={(v) => onChange(v === null || v === ALL ? null : v)}
      placeholder={placeholder}
      placeholderIcon={<AccountIcon type="BANK" />}
      searchable={accounts.length >= 6}
      size={size}
      disabled={disabled}
      className={className}
      id={id}
      ariaLabel={ariaLabel}
    />
  );
}
