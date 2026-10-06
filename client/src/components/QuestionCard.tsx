import type { ReactNode } from 'react';
import AnswerButton from './AnswerButton';
import { useEffect, useRef } from 'react';

export interface QuestionCardOption {
  text: string;
  correct: boolean;
}

interface Props {
  prompt: string;
  categoryLabel: string;
  index: number;
  total: number;
  options: QuestionCardOption[];
  selected: number | null;
  revealed: boolean;
  onSelect?: (index: number) => void;
  explanation?: string;
  source?: string;
  imageUrl?: string;
  imageAlt?: string;
  attribution?: string;
  difficulty?: number;
  footer?: ReactNode;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuestionCard({
  prompt,
  categoryLabel,
  index,
  total,
  options,
  selected,
  revealed,
  onSelect,
  explanation,
  source,
  imageUrl,
  imageAlt,
  attribution,
  difficulty,
  footer,
}: Props) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const correctIndex = options.findIndex((o) => o.correct);
  const isCorrect = selected === correctIndex;

  useEffect(() => {
    if (revealed) feedbackRef.current?.focus();
  }, [revealed]);

  return (
    <article className="card animate-fade-in">
      <header className="mb-3 flex items-center justify-between gap-2 text-sm">
        <span className="chip">{categoryLabel}</span>
        <span className="tabular-nums text-bark-700/70 dark:text-bark-200/60">
          {index + 1} / {total}
          {typeof difficulty === 'number' ? ` · vaikeus ${difficulty}/5` : ''}
        </span>
      </header>

      {imageUrl && (
        <figure className="mb-3">
          <img
            src={imageUrl}
            alt={imageAlt ?? 'Eläinkuva tunnistustehtävää varten'}
            loading="lazy"
            className="mx-auto max-h-72 w-full rounded-xl object-cover"
          />
          {attribution && (
            <figcaption className="mt-1 text-center text-[11px] text-bark-700/60 dark:text-bark-200/50">
              Kuva: {attribution}
            </figcaption>
          )}
        </figure>
      )}

      <h2 className="mb-4 text-lg font-bold leading-snug">{prompt}</h2>

      <div className="space-y-2">
        {options.map((option, i) => (
          <AnswerButton
            key={`${option.text}-${i}`}
            text={option.text}
            index={i}
            letter={LETTERS[i] ?? String(i + 1)}
            selected={selected === i}
            revealed={revealed}
            correct={option.correct}
            disabled={revealed}
            onSelect={() => onSelect?.(i)}
          />
        ))}
      </div>

      {revealed && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-bark-200 bg-bark-50 p-3 text-sm dark:border-bark-700 dark:bg-bark-800/60"
        >
          <p className={`font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {isCorrect ? '✓ Oikein!' : '✗ Väärin'}
          </p>
          {!isCorrect && (
            <p className="mt-1">
              <span className="font-semibold">Oikea vastaus: </span>
              {options[correctIndex]?.text}
            </p>
          )}
          {explanation && (
            <p className="mt-2 leading-relaxed">
              <span className="font-semibold">Miksi? </span>
              {explanation}
            </p>
          )}
          {source && (
            <p className="mt-2 text-[11px] text-bark-700/70 dark:text-bark-200/50">Lähde: {source}</p>
          )}
        </div>
      )}

      {footer && <div className="mt-4">{footer}</div>}
    </article>
  );
}
