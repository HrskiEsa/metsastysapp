import { useMemo, useState } from 'react';
import { useProgress } from '@/hooks/useProgress';
import { getSpeciesByType, speciesCoverage, speciesMastery } from '@/services/speciesEngine';
import { buildSpeciesItem, buildSpeciesItemBatch, type PracticeItem } from '@/services/questionEngine';
import { currentSpeciesPool } from '@/services/pool';
import SpeciesCard from '@/components/SpeciesCard';
import QuizRunner from '@/components/QuizRunner';
import ProgressBar from '@/components/ProgressBar';
import type { Species as SpeciesType } from '@/types';
import type { SpeciesType as SpeciesKind } from '@/services/speciesEngine';

type Filter = 'all' | SpeciesKind;

export default function Species() {
  const { state } = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SpeciesType | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [practice, setPractice] = useState<PracticeItem[] | null>(null);
  const [round, setRound] = useState(0);

  const mastery = useMemo(() => speciesMastery(state, filter === 'all' ? undefined : filter), [state, filter]);
  const coverage = speciesCoverage(state);

  const filtered = mastery.filter((m) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return [m.species.nameFi, m.species.nameSv, m.species.nameEn, m.species.scientific, m.species.group]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  function openDetail(species: SpeciesType) {
    setGalleryIndex(0);
    setSelected(species);
  }

  function startPractice(count = 10) {
    const pool = filter === 'all' ? currentSpeciesPool() : getSpeciesByType(filter);
    setPractice(buildSpeciesItemBatch(pool, count));
  }

  if (practice) {
    return (
      <div className="space-y-3">
        <QuizRunner
          key={round}
          title="Lajintunnistusharjoitus"
          items={practice}
          onExit={() => setPractice(null)}
          onRestart={() => {
            setRound((r) => r + 1);
            startPractice(practice.length);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-xl font-bold">Lajintunnistus</h1>
        <p className="mt-1 text-sm text-bark-700/70 dark:text-bark-200/60">
          Virallisessa tutkinnossa lajintuntemus on oma kuvatehtäväosionsa. Harjoittele tunnistamaan lajit varmasti.
        </p>
        <div className="mt-3">
          <ProgressBar
            label={`Tunnistetut lajit ${coverage.recognised}/${coverage.total}`}
            value={coverage.recognised}
            max={coverage.total}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => startPractice(10)}>
            ▶ Harjoittele 10 lajia
          </button>
          <button type="button" className="btn-secondary" onClick={() => startPractice(20)}>
            Koko sarja (20)
          </button>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'Kaikki' },
              { id: 'lintu', label: '🐦 Linnut' },
              { id: 'nisakas', label: '🦌 Nisäkkäät' },
            ] as { id: Filter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`chip ${filter === f.id ? 'border-brand-600 bg-brand-50 font-bold dark:bg-brand-950' : ''}`}
            >
              {f.label}
            </button>
          ))}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Etsi lajia…"
            aria-label="Etsi lajia"
            className="ml-auto w-full rounded-xl border border-bark-200 bg-white px-3 py-2 text-sm sm:w-48 dark:border-bark-700 dark:bg-bark-900"
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="card text-center text-sm">Ei osumia haulla “{query}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((m) => (
            <SpeciesCard
              key={m.species.id}
              species={m.species}
              percent={m.percent}
              attempts={m.attempts}
              onClick={() => openDetail(m.species)}
            />
          ))}
        </div>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.nameFi}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => {
            setSelected(null);
            setGalleryIndex(0);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl dark:bg-bark-900"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.images[0] && (
              <figure>
                <img
                  src={selected.images[galleryIndex].image_url}
                  alt={`${selected.nameFi} (${selected.scientific})`}
                  className="max-h-64 w-full rounded-xl object-cover"
                />
                {selected.images.length > 1 && (
                  <div className="mt-2 flex justify-center gap-2" role="tablist" aria-label="Kuvavalinta">
                    {selected.images.map((img, i) => (
                      <button
                        key={img.image_url}
                        type="button"
                        role="tab"
                        aria-selected={i === galleryIndex}
                        aria-label={`Kuva ${i + 1}`}
                        onClick={() => setGalleryIndex(i)}
                        className={`h-12 w-16 overflow-hidden rounded-lg border-2 ${
                          i === galleryIndex ? 'border-brand-600' : 'border-transparent opacity-70'
                        }`}
                      >
                        <img src={img.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                <figcaption className="mt-1 text-[11px] text-bark-700/60 dark:text-bark-200/50">
                  Kuva: {selected.images[galleryIndex].photographer} · {selected.images[galleryIndex].license} ·{' '}
                  {selected.images[galleryIndex].source_url && (
                    <a
                      className="underline"
                      href={selected.images[galleryIndex].source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      lähdesivu
                    </a>
                  )}
                </figcaption>
              </figure>
            )}

            <h2 className="mt-3 text-xl font-bold">{selected.nameFi}</h2>
            <p className="text-sm italic text-bark-700/70 dark:text-bark-200/60">
              {selected.scientific} · {selected.nameSv} · {selected.nameEn}
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">{selected.type === 'lintu' ? '🐦 Lintu' : '🦌 Nisäkäs'}</span>
              <span className="chip">{selected.group}</span>
              <span className="chip">Vaikeus {selected.difficulty}/5</span>
              <span className={`chip ${selected.huntable ? '' : 'border-red-400 text-red-700 dark:text-red-400'}`}>
                {selected.huntable ? 'Metsästettävä' : 'Ei metsästettävä'}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed">{selected.description}</p>
            <p className="mt-3 rounded-xl bg-bark-100 p-3 text-sm dark:bg-bark-800">
              <strong>Tuntomerkit: </strong>
              {selected.identificationTips}
            </p>
            <p className="mt-2 text-xs text-bark-700/70 dark:text-bark-200/50">Asema: {selected.status}</p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  const pool = currentSpeciesPool();
                  // Kolme tehtävää samasta lajista eri harhauttajilla.
                  setPractice([
                    buildSpeciesItem(selected, pool),
                    buildSpeciesItem(selected, pool),
                    buildSpeciesItem(selected, pool),
                  ]);
                  setSelected(null);
                }}
              >
                Harjoittele tätä lajia
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setSelected(null)}>
                Sulje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
