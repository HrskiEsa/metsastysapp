import type { ExamResult } from '@/services/examEngine';
import { categoryName } from '@/data/bundle';
import ProgressBar from './ProgressBar';

export default function ResultCard({ result, onReview }: { result: ExamResult; onReview?: () => void }) {
  const wrong = result.total - result.correct;

  return (
    <section className="space-y-4">
      <div className="card text-center">
        <p className="label">Harjoituskoe valmis</p>
        <p className="mt-1 text-5xl font-black tabular-nums">
          {result.correct} / {result.total}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{result.percent} %</p>
        <div className="mt-3">
          <ProgressBar value={result.percent} color={result.passed ? 'green' : 'red'} />
        </div>
        <p
          className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
            result.passed
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
          }`}
        >
          <span aria-hidden>{result.passed ? '✓' : '✗'}</span>
          {result.passed ? 'HARJOITUSKOE LÄPI' : 'HARJOITUSKOE EI MENNYT LÄPI'}
        </p>
        <p className="mt-2 text-xs text-bark-700/70 dark:text-bark-200/50">
          Harjoituksen hyväksymisraja {result.passPercent} % vastaa virallista sääntöä: vääriä vastauksia enintään 8
          (vähintään 52/60). Tämä ei ole virallinen tutkintosuoritus.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-bark-100 p-2 dark:bg-bark-800">
            <p className="tabular-nums font-bold">{result.theory.correct}/{result.theory.total}</p>
            <p className="text-[11px]">Teoria</p>
          </div>
          <div className="rounded-lg bg-bark-100 p-2 dark:bg-bark-800">
            <p className="tabular-nums font-bold">{result.species.correct}/{result.species.total}</p>
            <p className="text-[11px]">Lajit</p>
          </div>
          <div className="rounded-lg bg-bark-100 p-2 dark:bg-bark-800">
            <p className="tabular-nums font-bold">{wrong}</p>
            <p className="text-[11px]">Vääriä</p>
          </div>
        </div>
        {onReview && (
          <button type="button" className="btn-primary mt-4 w-full" onClick={onReview}>
            Näytä virheet
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="mb-2 font-bold">Aihealueittain</h3>
        <ul className="space-y-2">
          {Object.entries(result.categoryBreakdown).map(([category, data]) => (
            <li key={category}>
              <ProgressBar
                label={`${categoryName(category)} (${data.correct}/${data.total})`}
                value={data.correct}
                max={data.total}
                size="sm"
                color={data.correct / data.total >= 0.75 ? 'green' : 'red'}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
