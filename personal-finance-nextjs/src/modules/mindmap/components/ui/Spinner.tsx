export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
    </div>
  );
}
