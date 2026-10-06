import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import {
  activeDeadline,
  answer,
  calculateResult,
  createExam,
  goTo,
  toggleFlag,
  type ExamState,
} from '@/services/examEngine';
import { categoryName, getBundle, getMode } from '@/data/bundle';
import QuestionCard from '@/components/QuestionCard';
import ProgressBar from '@/components/ProgressBar';
import Timer from '@/components/Timer';

export default function Exam() {
  const { saveExam } = useProgress();
  const navigate = useNavigate();
  const [modeId, setModeId] = useState<'full' | 'quick'>('full');
  const [timed, setTimed] = useState(true);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const mode = getMode(modeId);
  const config = getBundle().examConfig;
  const examRef = useRef<ExamState | null>(exam);
  examRef.current = exam;

  const finish = useCallback(
    (current: ExamState) => {
      const result = calculateResult(current);
      saveExam(result);
      navigate('/results', { replace: true, state: { result } });
    },
    [navigate, saveExam],
  );

  const onExpire = useCallback(() => {
    const current = examRef.current;
    if (current && !current.finished) finish({ ...current, finished: true });
  }, [finish]);

  const deadline = useMemo(() => (exam ? activeDeadline(exam) : Date.now()), [exam]);

  if (!exam) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Harjoituskoe</h1>
        <p className="text-sm text-bark-700/70 dark:text-bark-200/60">
          Koe noudattaa virallisen tutkinnon rakennetta: lajintuntemus suoritetaan ensin, minkä jälkeen seuraavat
          teoriakysymykset.
        </p>

        <div className="space-y-3">
          {(['quick', 'full'] as const).map((id) => {
            const m = getMode(id);
            const active = modeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setModeId(id)}
                className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                  active ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40' : 'border-bark-100 dark:border-bark-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{m.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{m.totalQuestions} kysymystä</span>
                </div>
                <p className="mt-1 text-xs text-bark-700/70 dark:text-bark-200/60">{m.description}</p>
                <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <li>🦌 Lajintunnistus: {m.speciesCount} kpl</li>
                  <li>⏱ Lajit: {Math.round(m.speciesTimeSeconds / 60)} min</li>
                  <li>📘 Teoria: {m.theoryCount} kpl</li>
                  <li>⏱ Koko koe: {Math.round(m.totalTimeSeconds / 60)} min</li>
                </ul>
              </button>
            );
          })}
        </div>

        <section className="card">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-semibold">Aikaraja päällä</span>
              <span className="block text-xs text-bark-700/70 dark:text-bark-200/60">
                Ilman aikarajaa voit keskittyä pohtimaan rauhassa.
              </span>
            </span>
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              className="h-6 w-6 accent-brand-600"
            />
          </label>          <h2 className="mt-4 font-bold">Teoriakysymysten jakauma</h2>
          <ul className="mt-1 grid grid-cols-2 gap-1 text-sm">
            {Object.entries(config.distribution)
              .filter(([k]) => !k.startsWith('$'))
              .map(([category, n]) => (
                <li key={category} className="flex justify-between">
                  <span className="text-bark-700/80 dark:text-bark-200/70">{categoryName(category)}</span>
                  <span className="tabular-nums font-semibold">{n}</span>
                </li>
              ))
            }
          </ul>

          {config.officialExam && (
            <div className="mt-4 rounded-xl bg-bark-100 p-3 text-xs leading-relaxed dark:bg-bark-800">
              <p className="font-bold">Virallinen tutkinto (Riistakeskus, riista.fi)</p>
              <p className="mt-1">
                60 kysymystä (15 lajintuntemusta + 45 teoriaa) · lajiosio enintään 15 min · koko koe enintään 1,5 h.
                <br />
                Hyväksytty: <strong>vääriä vastauksia enintään {config.officialExam.maxWrongAnswers}</strong> (eli
                vähintään {config.officialExam.minCorrectAnswers}/60 oikein). Maksu {config.officialExam.feeEuro} € /
                koekerta. Vastauskieli: suomi, ruotsi, saame tai englanti.
              </p>
            </div>
          )}

          <button
            type="button"
            className="btn-primary mt-4 w-full"
            onClick={() => {
              const created = createExam(modeId);
              setExam({ ...created, timed });
            }}
          >
            Aloita {mode.label.toLowerCase()}
          </button>
        </section>

        <p className="px-1 text-center text-[11px] leading-relaxed text-bark-700/60 dark:text-bark-200/50">
          {config.disclaimer}
        </p>
      </div>
    );
  }

  const item = exam.items[exam.currentIndex];
  const inSpecies = exam.currentIndex < exam.speciesCount;
  const answeredCount = Object.keys(exam.answers).length;
  const selected = exam.answers[item.itemId] ?? null;

  return (
    <div className="space-y-3">
      <div className="sticky top-[64px] z-10 -mx-4 space-y-2 border-b border-bark-100 bg-bark-50/95 px-4 py-2 backdrop-blur dark:border-bark-800 dark:bg-bark-950/95">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-bold tabular-nums">
            Kysymys {exam.currentIndex + 1} / {exam.items.length}
          </span>
          <div className="flex items-center gap-2">
            {exam.timed && <Timer endAt={deadline} onExpire={onExpire} label="Aikaa jäljellä" />}
            <button type="button" className="btn-ghost !min-h-0 !px-2 !py-1 text-sm" onClick={() => setConfirmQuit(true)}>
              Lopeta
            </button>
          </div>
        </div>
        <ProgressBar value={answeredCount} max={exam.items.length} size="sm" />
        {exam.timed && inSpecies && (
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            🦌 Lajintuntemusosio – tässä osiossa on tiukempi aikaraja ({Math.round(mode.speciesTimeSeconds / 60)} min).
          </p>
        )}
      </div>

      <QuestionCard
        prompt={item.prompt}
        categoryLabel={inSpecies ? 'Lajintuntemus' : categoryName(item.category)}
        index={exam.currentIndex}
        total={exam.items.length}
        options={item.options}
        selected={selected}
        revealed={false}
        onSelect={(i) => setExam((prev) => (prev ? answer(prev, item.itemId, i) : prev))}
        imageUrl={item.imageUrl}
        imageAlt="Lajintunnistustehtävä"
        attribution={item.attribution}
        difficulty={item.difficulty}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={exam.currentIndex === 0}
          onClick={() => setExam((prev) => (prev ? goTo(prev, prev.currentIndex - 1) : prev))}
        >
          ← Edellinen
        </button>
        <button
          type="button"
          className={exam.flagged.includes(item.itemId) ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setExam((prev) => (prev ? toggleFlag(prev, item.itemId) : prev))}
          aria-pressed={exam.flagged.includes(item.itemId)}
        >
          ⭐ {exam.flagged.includes(item.itemId) ? 'Merkitty' : 'Merkitse tarkistettavaksi'}
        </button>
        {exam.currentIndex < exam.items.length - 1 ? (
          <button
            type="button"
            className="btn-primary ml-auto"
            onClick={() => setExam((prev) => (prev ? goTo(prev, prev.currentIndex + 1) : prev))}
          >
            Seuraava →
          </button>
        ) : (
          <button type="button" className="btn-primary ml-auto" onClick={() => finish(exam)}>
            Päätä koe
          </button>
        )}
      </div>

      <section className="card">
        <h2 className="font-bold">Kysymysluettelo</h2>
        <p className="mb-2 text-xs text-bark-700/70 dark:text-bark-200/60">
          Vastattu {answeredCount} / {exam.items.length}
          {exam.flagged.length > 0 ? ` · merkitty ${exam.flagged.length}` : ''}
        </p>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
          {exam.items.map((it, index) => {
            const isAnswered = exam.answers[it.itemId] !== undefined;
            const isFlagged = exam.flagged.includes(it.itemId);
            const isCurrent = index === exam.currentIndex;
            return (
              <button
                key={it.itemId}
                type="button"
                onClick={() => setExam((prev) => (prev ? goTo(prev, index) : prev))}
                title={`Kysymys ${index + 1}${isFlagged ? ' (merkitty)' : ''}`}
                aria-label={`Siirry kysymykseen ${index + 1}${isFlagged ? ', merkitty tarkistettavaksi' : ''}`}
                className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold ${
                  isCurrent
                    ? 'bg-brand-700 text-white'
                    : isAnswered
                      ? 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100'
                      : 'bg-bark-100 text-bark-700 dark:bg-bark-800 dark:text-bark-200'
                } ${isFlagged ? 'ring-2 ring-amber-500' : ''}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => finish(exam)}>
          Päätä koe ja näytä tulos
        </button>
      </section>

      {confirmQuit && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-center dark:bg-bark-900">
            <h2 className="font-bold">Lopetetaanko koe?</h2>
            <p className="mt-1 text-sm text-bark-700/70 dark:text-bark-200/60">
              Vastaamattomat kysymykset lasketaan vääriksi.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmQuit(false)}>
                Jatka koetta
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => finish(exam)}>
                Päätä koe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
