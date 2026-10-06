import { Link } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import { buildSummary, weeklyActivity, levelOf } from '@/services/statistics';
import { speciesMastery, speciesCoverage } from '@/services/speciesEngine';
import { getWeakQuestions } from '@/services/questionEngine';
import { ACHIEVEMENTS } from '@/services/achievements';
import ProgressBar from '@/components/ProgressBar';
import CategoryBar from '@/components/CategoryBar';
import { getBundle } from '@/data/bundle';

export default function Statistics() {
  const { state } = useProgress();
  const summary = buildSummary(state);
  const week = weeklyActivity(state);
  const mastery = speciesMastery(state);
  const coverage = speciesCoverage(state);
  const weak = getWeakQuestions(state, 8);
  const unlocked = new Set(state.profile.achievements);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Edistyminen</h1>

      <section className="card space-y-3">
        <ProgressBar label="Yhteensä" value={summary.overall.percent} />
        <ProgressBar label="Teoria" value={summary.theory.percent} color="green" />
        <ProgressBar label="Lajintunnistus" value={summary.species.percent} color="yellow" />
        <ProgressBar label="Harjoituskokeet" value={summary.exams.percent} color="brand" />
        <p className="text-xs text-bark-700/60 dark:text-bark-200/50">
          Vastauksia yhteensä {summary.overall.attempts} kpl · harjoituskokeita {state.exams.length} kpl
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold">Viikon aktiivisuus</h2>
        <div className="mt-3 flex items-end justify-between gap-1">
          {week.map((day) => {
            const max = Math.max(1, ...week.map((d) => d.count));
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-bark-700/60 dark:text-bark-200/50">
                  {day.count || ''}
                </span>
                <div
                  className="w-full rounded-t bg-brand-500/70"
                  style={{ height: `${Math.max(4, (day.count / max) * 48)}px` }}
                  aria-hidden
                />
                <span className="text-[10px]">{day.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-bark-700/60 dark:text-bark-200/50">Harjoitusputki: {state.profile.streak} päivää</p>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Aihealueittain</h2>
        <div className="space-y-2">
          {summary.categories.map(({ category, accuracy }) => (
            <CategoryBar
              key={category.id}
              category={category}
              percent={accuracy.percent}
              attempts={accuracy.attempts}
              to={`/practice?mode=category&category=${category.id}`}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Lajikohtainen seuranta</h2>
          <Link to="/species" className="text-sm font-semibold text-brand-700 dark:text-brand-400">
            Kaikki lajit →
          </Link>
        </div>
        <p className="mb-2 text-xs text-bark-700/60 dark:text-bark-200/50">
          Tunnistettu {coverage.recognised}/{coverage.total} lajia
        </p>
        <ul className="space-y-1.5">
          {mastery
            .filter((m) => m.attempts > 0)
            .slice(0, 10)
            .map((m) => {
              const level = levelOf(m.percent);
              return (
                <li key={m.species.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{level.dot}</span>
                    {m.species.nameFi}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {m.percent} % <span className="text-xs font-normal">({m.correct}/{m.attempts})</span>
                  </span>
                </li>
              );
            })}
        </ul>
        {mastery.every((m) => m.attempts === 0) && (
          <p className="text-sm text-bark-700/70 dark:text-bark-200/60">Ei vielä lajintunnistusvastauksia.</p>
        )}
      </section>

      {weak.length > 0 && (
        <section className="card">
          <h2 className="font-bold">Heikoimmat kysymykset</h2>
          <p className="mb-2 text-xs text-bark-700/60 dark:text-bark-200/50">
            Alle 60 % onnistuminen – nämä kannattaa kerrata ensimmäisenä.
          </p>
          <ul className="space-y-2 text-sm">
            {weak.map((q) => {
              const stat = state.questionStats[q.id];
              const percent = stat && stat.attempts ? Math.round((stat.correct / stat.attempts) * 100) : 0;
              return (
                <li key={q.id} className="border-b border-bark-100 pb-2 last:border-0 dark:border-bark-800">
                  <p className="font-medium">{q.question}</p>
                  <p className="text-xs text-bark-700/60 dark:text-bark-200/50">
                    {percent} % oikein · {stat?.correct ?? 0}/{stat?.attempts ?? 0} ·{' '}
                    {getBundle().categories.find((c) => c.id === q.category)?.short}
                  </p>
                </li>
              );
            })}
          </ul>
          <Link to="/practice?mode=weak" className="btn-primary mt-3 w-full">
            🎯 Harjoittele heikoimpia
          </Link>
        </section>
      )}

      <section className="card">
        <h2 className="font-bold">Harjoituskokeet</h2>
        {state.exams.length === 0 ? (
          <p className="text-sm text-bark-700/70 dark:text-bark-200/60">Ei vielä tehtyjä kokeita.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {[...state.exams]
              .reverse()
              .slice(0, 5)
              .map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span>
                    {e.mode === 'full' ? 'Täysi koe' : 'Pikakoe'} ·{' '}
                    {new Date(e.finishedAt).toLocaleDateString('fi-FI')}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {e.percent} % {e.passed ? '✓' : '✗'}
                  </span>
                </li>
              ))}
          </ul>
        )}
        <Link to="/results" className="btn-secondary mt-3 w-full">
          Kaikki tulokset
        </Link>
      </section>

      <section className="card">
        <h2 className="font-bold">Saavutukset ({unlocked.size}/{ACHIEVEMENTS.length})</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACHIEVEMENTS.map((a) => (
            <span
              key={a.id}
              title={a.title}
              className={`chip ${unlocked.has(a.id) ? 'border-brand-500' : 'opacity-50'}`}
            >
              <span aria-hidden>{unlocked.has(a.id) ? a.icon : '🔒'}</span>
              <span className="text-xs">{a.title}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
