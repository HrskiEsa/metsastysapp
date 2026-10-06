interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: 'brand' | 'red' | 'yellow' | 'green';
  size?: 'sm' | 'md';
}

const COLORS: Record<string, string> = {
  brand: 'bg-brand-600',
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
};

export default function ProgressBar({ value, max = 100, label, color = 'brand', size = 'md' }: ProgressBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="tabular-nums font-semibold">{percent} %</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Edistyminen'}
        className={`w-full overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800 ${size === 'sm' ? 'h-2' : 'h-3'}`}
      >
        <div className={`h-full rounded-full transition-all ${COLORS[color]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
