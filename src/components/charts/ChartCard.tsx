'use client';

import { useState } from 'react';
import { ChartColumn, Table } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  // Bảng số liệu tương đương biểu đồ (truy cập được không cần màu/hover)
  table?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, table, actions, className = '' }: Props) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`glass-card p-4 md:p-5 min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actions}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="btn-icon !p-1.5"
              title={showTable ? 'Xem biểu đồ' : 'Xem bảng số liệu'}
              aria-label={showTable ? 'Xem biểu đồ' : 'Xem bảng số liệu'}
              aria-pressed={showTable}
            >
              {showTable ? <ChartColumn className="w-4 h-4" /> : <Table className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {showTable && table ? <div className="overflow-x-auto max-h-80 overflow-y-auto">{table}</div> : children}
    </section>
  );
}

// Bảng nhỏ gọn cho chế độ "xem bảng" của biểu đồ
export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm tabular">
      <thead className="table-header sticky top-0">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`px-3 py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="table-row">
            {r.map((c, j) => (
              <td key={j} className={`px-3 py-1.5 ${j === 0 ? 'text-left text-text' : 'text-right text-text-secondary'}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
