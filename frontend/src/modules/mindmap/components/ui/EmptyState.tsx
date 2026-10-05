import { Sparkles } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-12 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-500">
        <Sparkles size={22} />
      </div>
      <p className="font-semibold text-gray-800">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
