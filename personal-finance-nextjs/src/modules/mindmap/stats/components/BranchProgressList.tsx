'use client';

import Link from 'next/link';
import { BranchStat } from '../api';

/** Per-branch progress for the week: track + violet fill + direct numbers. */
export function BranchProgressList({ branches }: { branches: BranchStat[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Tiến độ theo nhánh
      </h3>
      {branches.length === 0 ? (
        <p className="text-sm text-gray-400">
          Tuần này chưa có todo nào gắn với nhánh mindmap.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {branches.map((branch) => {
            const percent =
              branch.total > 0
                ? Math.round((branch.done / branch.total) * 100)
                : 0;
            return (
              <li key={branch.nodeId}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Link
                    href={`/mindmap/${branch.mindmapId}/nodes/${branch.nodeId}`}
                    className="truncate text-sm font-medium text-gray-700 hover:text-violet-700"
                  >
                    {branch.title}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      {branch.mindmapTitle}
                    </span>
                  </Link>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-gray-500">
                    {branch.done}/{branch.total} · {percent}%
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-gray-100"
                  title={`${branch.title}: ${branch.done}/${branch.total} todo (${percent}%)`}
                >
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
