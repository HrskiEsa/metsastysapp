import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import { buildDailySession, buildPracticeSession, type PracticeItem } from '@/services/questionEngine';
import { theoryCategories } from '@/services/statistics';
import QuizRunner from '@/components/QuizRunner';
import { getBundle } from '@/data/bundle';

type Mode = 'all' | 'category' | 'weak' | 'wrong' | 'difficult' | 'due' | 'daily';

const MODES: { id: Mode; icon: string; title: string; description: string }[] = [
  { id: 'all', icon: '📚', title: 'Kaikki kysymykset', description: 'Sekoitettu harjoitus koko pankista.' },
  { id: 'weak', icon: '🎯', title: 'Heikoimmat osa-alueet', description: 'Kysymykset, joissa onnistuminen on alle 60 %.' },
  { id: 'wrong', icon: '🔁', title: 'Väärin vastatut', description: 'Kertaa kysymykset, jotka ovat menneet väärin.' },
  { id: 'due', icon: '⏰', title: 'Kerrattavat nyt', description: 'Kertausaikataulun mukaan erääntyneet kysymykset.' },
  { id: 'difficult', icon: '🔥', title: 'Vaikeat kysymykset', description: 'Vaikeustaso 4–5.' },
];

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useProgress();
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(10);

  const mode = (params.get('mode') as Mode | null) ?? null;
  const category = params.get('category') ?? undefined;

  // Session tila lukitaan session alussa: jos riippuvuuksiin lisätään `state`,
  // kysymyslista sekoittuisi uudelleen jokaisen vastauksen jälkeen.
  const stateRef = useRef(state);
  stateRef.current = state;

  const items = useMemo<PracticeItem[]>(() => {
    if (!mode) return [];
    if (mode === 'daily') return buildDailySession(stateRef.current);
    return buildPracticeSession({
      mode,
      category,
      count,
      state: stateRef.current,
      includeSpecies: mode === 'all',
      speciesCount: Math.max(2, Math.round(count / 3)),
    });
    // round pakottaa uuden session, kun käyttäjä haluaa harjoitella uudelleen
  }, [mode, category, count, round]);

  if (!mode) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Harjoittele</h1>
        <p className="text-sm text-bark-700/70 dark:text-bark-200/60">
          Valitse harjoitusmuoto. Jokaisen kysymyksen jälkeen saat selityksen – se on oppimisen ydin.
        </p>

        <div className="space-y-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setParams({ mode: m.id })}
              className="flex w-full items-center gap-3 rounded-2xl border border-bark-100 bg-white p-4 text-left transition hover:border-brand-400 dark:border-bark-800 dark:bg-bark-900"
            >
              <span aria-hidden className="text-2xl">
                {m.icon}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{m.title}</span>
                <span className="block text-xs text-bark-700/70 dark:text-bark-200/60">{m.description}</span>
              </span>
              <span aria-hidden>›</span>
            </button>
          ))}
        </div>

        <section className="card">
          <h2 className="font-bold">Aihealueittain</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {theoryCategories().map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setParams({ mode: 'category', category: c.id })}
                className="flex items-center gap-2 rounded-xl border border-bark-200 p-3 text-left text-sm font-semibold transition hover:border-brand-400 dark:border-bark-700"
              >
                <span aria-hidden>{c.icon}</span>
                {c.nameFi}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold">Harjoituksen pituus</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[5, 10, 20, 40].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`chip ${count === n ? 'border-brand-600 bg-brand-50 font-bold dark:bg-brand-950' : ''}`}
              >
                {n} kysymystä
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-bark-700/60 dark:text-bark-200/50">
            Kysymyksiä pankissa yhteensä {getBundle().stats.questions} kpl, lajeja {getBundle().stats.species} kpl.
          </p>
        </section>
      </div>
    );
  }

  const title =
    mode === 'daily'
      ? 'Päivän harjoitus'
      : mode === 'category'
        ? `Harjoitus: ${theoryCategories().find((c) => c.id === category)?.short ?? ''}`
        : MODES.find((m) => m.id === mode)?.title ?? 'Harjoitus';

  return (
    <div className="space-y-3">
      <button type="button" className="btn-ghost !min-h-0 !px-2 !py-1 text-sm" onClick={() => navigate('/practice')}>
        ← Harjoitusvalikko
      </button>
      <QuizRunner
        key={`${mode}-${category}-${count}-${round}`}
        title={title}
        items={items}
        onExit={() => navigate('/practice')}
        onRestart={() => setRound((r) => r + 1)}
      />
      <p className="text-center text-xs text-bark-700/60 dark:text-bark-200/50">
        Vinkki: kertaus muuttuu tehokkaammaksi, kun palaat väärin menneisiin kysymyksiin{' '}
        <Link to="/practice?mode=wrong" className="font-semibold underline">
          täältä
        </Link>
        .
      </p>
    </div>
  );
}
