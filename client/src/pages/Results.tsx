import { useLocation, useNavigate } from 'react-router-dom';
import type { ExamResult } from '@/services/examEngine';
import { useProgress } from '@/hooks/useProgress';
import { categoryName } from '@/data/bundle';
import ResultCard from '@/components/ResultCard';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useProgress();
  const result = (location.state as { result?: ExamResult } | null)?.result;

  if (!result) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Koetulokset</h1>
        {state.exams.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm">Et ole vielä tehnyt harjoituskoetta.</p>
            <button type="button" className="btn-primary mt-3" onClick={() => navigate('/exam')}>
              Tee harjoituskoe
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {[...state.exams].reverse().map((exam) => (
              <li key={exam.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {exam.mode === 'full' ? 'Täysi koe' : 'Pikakoe'}{' '}
                    <span className="text-xs font-normal text-bark-700/60 dark:text-bark-200/50">
                      {new Date(exam.finishedAt).toLocaleString('fi-FI')}
                    </span>
                  </p>
                  <p className="text-xs text-bark-700/70 dark:text-bark-200/60">
                    {exam.correct}/{exam.totalQuestions} oikein · {Math.round(exam.durationSeconds / 60)} min
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                    exam.passed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}
                >
                  {exam.passed ? '✓ ' : '✗ '}
                  {exam.percent} %
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const wrongRows = result.review.filter((r) => !r.isCorrect);

  return (
    <div className="space-y-4">
      <ResultCard result={result} onReview={() => document.getElementById('virheet')?.scrollIntoView({ behavior: 'smooth' })} />

      <section id="virheet" className="space-y-3">
        <h2 className="text-lg font-bold">Virheet ({wrongRows.length})</h2>
        {wrongRows.length === 0 ? (
          <p className="card text-center text-sm">Kaikki vastaukset oikein – upeaa! 🎉</p>
        ) : (
          wrongRows.map((row) => (
            <article key={row.item.itemId} className="card">
              <p className="label">{categoryName(row.item.category)}</p>
              {row.item.imageUrl && (
                <img
                  src={row.item.imageUrl}
                  alt="Lajintunnistustehtävän kuva"
                  loading="lazy"
                  className="mt-2 max-h-48 w-full rounded-xl object-cover"
                />
              )}
              <h3 className="mt-2 font-semibold leading-snug">{row.item.prompt}</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                ✗ Vastasit: {row.chosenIndex !== null ? row.item.options[row.chosenIndex]?.text : 'Ei vastausta'}
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                ✓ Oikea vastaus: {row.item.options[row.correctIndex]?.text}
              </p>
              {row.item.explanation && (
                <p className="mt-2 text-sm leading-relaxed">
                  <strong>Miksi? </strong>
                  {row.item.explanation}
                </p>
              )}
            </article>
          ))
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => navigate('/practice?mode=wrong')}
        >
          🔁 Harjoittele väärin menneet
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={() => navigate('/exam')}>
          Tee uusi koe
        </button>
      </div>
    </div>
  );
}
