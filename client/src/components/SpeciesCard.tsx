import type { Species } from '@/types';

interface Props {
  species: Species;
  percent?: number;
  attempts?: number;
  onClick?: () => void;
}

export default function SpeciesCard({ species, percent, attempts = 0, onClick }: Props) {
  const image = species.images[0];
  const level = attempts === 0 ? 'none' : percent! < 65 ? 'red' : percent! < 85 ? 'yellow' : 'green';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-bark-100 bg-white text-left shadow-sm transition hover:border-brand-400 dark:border-bark-800 dark:bg-bark-900"
    >
      {image ? (
        <img
          src={image.thumbnail_url || image.image_url}
          alt={`${species.nameFi} (${species.scientific})`}
          loading="lazy"
          className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-bark-100 text-3xl dark:bg-bark-800" aria-hidden>
          🐾
        </div>
      )}
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold">{species.nameFi}</span>
          {attempts > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${
                  level === 'red' ? 'bg-red-500' : level === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              {percent} %
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-bark-700/60 dark:text-bark-200/50">
          {species.type === 'lintu' ? '🐦' : '🦌'} {species.group}
        </p>
      </div>
    </button>
  );
}
