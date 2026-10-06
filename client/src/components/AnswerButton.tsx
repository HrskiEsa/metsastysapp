interface Props {
  text: string;
  index: number;
  letter: string;
  selected: boolean;
  revealed: boolean;
  correct: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export default function AnswerButton({
  text,
  index,
  letter,
  selected,
  revealed,
  correct,
  disabled,
  onSelect,
}: Props) {
  const state = !revealed ? 'idle' : correct ? 'correct' : selected ? 'wrong' : 'idle';

  const styles =
    state === 'correct'
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
      : state === 'wrong'
        ? 'border-red-500 bg-red-50 dark:bg-red-950/40'
        : selected
          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
          : 'border-bark-200 bg-white hover:border-brand-400 dark:border-bark-700 dark:bg-bark-900';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-base transition active:scale-[0.995] disabled:cursor-default ${styles}`}
    >
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bark-100 text-sm font-bold dark:bg-bark-800"
      >
        {letter}
      </span>
      <span className="flex-1">{text}</span>
      {/* Oikein/väärin ilmaistaan kuvakkeella ja tekstillä, ei pelkällä värillä */}
      {revealed && correct && (
        <span className="shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-400" aria-label="Oikea vastaus">
          ✓ Oikein
        </span>
      )}
      {revealed && !correct && selected && (
        <span className="shrink-0 text-sm font-bold text-red-700 dark:text-red-400" aria-label="Väärä vastaus">
          ✗ Väärin
        </span>
      )}
      <span className="sr-only">Vaihtoehto {index + 1}</span>
    </button>
  );
}
