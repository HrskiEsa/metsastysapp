import { Link } from 'react-router-dom';
import type { Category } from '@/types';
import { levelOf } from '@/services/statistics';
import ProgressBar from './ProgressBar';

interface Props {
  category: Category;
  percent: number;
  attempts: number;
  to?: string;
}

export default function CategoryBar({ category, percent, attempts, to }: Props) {
  const level = levelOf(percent, attempts > 0);
  const body = (
    <div className="flex items-center gap-3 rounded-xl border border-bark-100 bg-white p-3 transition hover:border-brand-400 dark:border-bark-800 dark:bg-bark-900">
      <span aria-hidden className="text-xl">
        {category.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{category.short}</span>
          <span className="flex items-center gap-2 text-sm">
            {/* Väri ei ole ainoa merkki: mukaan tulee aina kuvake ja teksti (ohje kohta 44) */}
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full ${
                level.color === 'red'
                  ? 'bg-red-500'
                  : level.color === 'yellow'
                    ? 'bg-amber-500'
                    : level.color === 'green'
                      ? 'bg-emerald-500'
                      : 'bg-bark-300 dark:bg-bark-700'
              }`}
            />
            <span className="tabular-nums font-semibold">
              {attempts > 0 ? `${percent} %` : '–'}
            </span>
          </span>
        </div>
        <div className="mt-1">
          <ProgressBar
            value={attempts > 0 ? percent : 0}
            size="sm"
            color={level.color === 'none' ? 'brand' : (level.color as 'red' | 'yellow' | 'green')}
          />
        </div>
        <p className="mt-1 text-[11px] text-bark-700/60 dark:text-bark-200/50">
          {attempts > 0 ? `${attempts} vastausta · ${level.label}` : 'Ei vielä vastauksia'}
        </p>
      </div>
    </div>
  );

  return to ? (
    <Link to={to} aria-label={`Harjoittele: ${category.nameFi}`}>
      {body}
    </Link>
  ) : (
    body
  );
}
