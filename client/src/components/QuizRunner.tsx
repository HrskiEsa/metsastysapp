import { useMemo, useRef, useState } from 'react';
import type { SpeciesImage } from '@/types';
import { useProgress } from '@/hooks/useProgress';
import { categoryName } from '@/data/bundle';
import type { PracticeItem } from '@/services/questionEngine';
import QuestionCard from './QuestionCard';
import ProgressBar from './ProgressBar';

interface Props {
  title: string;
  items: PracticeItem[];
  onExit: () => void;
  onRestart?: () => void;
}

export default function QuizRunner({ title, items, onExit, onRestart }: Props) {
  const { answerQuestion, answerSpecies } = useProgress();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const startRef = useRef(Date.now());
  const finished = index >= items.length;
  // Lajikysymyksen kuva arvotaan kerran per kysymys lajin kaikista tunnistuskuvista.
  const [imageSeed, setImageSeed] = useState(0);

  const item = items[index];

  const view = useMemo(() => {
    if (!item) return null;
    if (item.kind === 'theory' && item.question) {
      return {
        prompt: item.question.question,
        categoryLabel: categoryName(item.question.category),
        options: item.question.answers,
        explanation: item.question.explanation,
        source: `${item.question.source.title}${item.question.source.page ? `, s. ${item.question.source.page}` : ''}`,
        difficulty: item.question.difficulty,
        imageUrl: undefined as string | undefined,
        imageAlt: undefined as string | undefined,
        attribution: undefined as string | undefined,
      };
    }
    const species = item.species!;
    const image: SpeciesImage | undefined =
      species.images.length > 0 ? species.images[imageSeed % species.images.length] : undefined;
    return {
      prompt: 'Mikä laji on kuvassa?',
      categoryLabel: 'Lajintuntemus',
      options: item.options ?? [],
      explanation: `${species.nameFi} (${species.scientific}). ${species.identificationTips}`,
      source: species.status,
      difficulty: species.difficulty,
      imageUrl: image?.image_url,
      imageAlt: `Lajintunnistustehtävä: ${species.group.toLowerCase()}`,
      attribution: image?.attribution,
    };
  }, [item, imageSeed]);

  /** Valitsee vaihtoehdon – vastaus vahvistetaan erikseen VASTAA-painikkeella. */
  function select(optionIndex: number) {
    if (revealed) return;
    setSelected(optionIndex);
  }

  /** Vahvistaa vastauksen, näyttää selityksen ja kirjaa tuloksen. */
  function confirm() {
    if (revealed || selected === null || !view) return;
    setRevealed(true);
    const correct = view.options[selected]?.correct ?? false;
    setResults((prev) => [...prev, correct]);
    if (item.kind === 'theory' && item.question) {
      answerQuestion(item.question.id, correct, Date.now() - startRef.current);
    } else if (item.species) {
      answerSpecies(item.species.id, correct);
    }
  }

  function next() {
    setSelected(null);
    setRevealed(false);
    setIndex((i) => i + 1);
    setImageSeed(Math.floor(Math.random() * 1000));
    startRef.current = Date.now();
  }

  if (finished) {
    const correct = results.filter(Boolean).length;
    const percent = results.length ? Math.round((correct / results.length) * 100) : 0;
    return (
      <section className="card text-center">
        <p className="label">{title}</p>
        <p className="mt-2 text-4xl font-black tabular-nums">
          {correct} / {results.length}
        </p>
        <p className="mt-1 text-xl font-bold">{percent} %</p>
        <div className="mt-3">
          <ProgressBar value={percent} color={percent >= 75 ? 'green' : percent >= 50 ? 'yellow' : 'red'} />
        </div>
        <p className="mt-3 text-sm text-bark-700/70 dark:text-bark-200/60">
          {correct === results.length
            ? 'Täysi sarja – loistavaa! 🎉'
            : 'Kertaa väärin menneet kysymykset "Harjoittele" -osiossa.'}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {onRestart && (
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                setIndex(0);
                setResults([]);
                setSelected(null);
                setRevealed(false);
                onRestart();
              }}
            >
              Harjoittele uudelleen
            </button>
          )}
          <button type="button" className="btn-secondary flex-1" onClick={onExit}>
            Lopeta
          </button>
        </div>
      </section>
    );
  }

  if (!view || !item) {
    return (
      <section className="card text-center">
        <p>Tälle valinnalle ei löytynyt kysymyksiä.</p>
        <button type="button" className="btn-primary mt-3" onClick={onExit}>
          Takaisin
        </button>
      </section>
    );
  }

  const last = index === items.length - 1;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">{title}</h1>
        <button type="button" className="btn-ghost !min-h-0 !px-2 !py-1 text-sm" onClick={onExit}>
          ✕ Lopeta
        </button>
      </div>
      <ProgressBar value={index} max={items.length} size="sm" label={`Kysymys ${index + 1} / ${items.length}`} />

      <QuestionCard
        prompt={view.prompt}
        categoryLabel={view.categoryLabel}
        index={index}
        total={items.length}
        options={view.options}
        selected={selected}
        revealed={revealed}
        onSelect={select}
        explanation={view.explanation}
        source={view.source}
        imageUrl={view.imageUrl}
        imageAlt={view.imageAlt}
        attribution={view.attribution}
        difficulty={view.difficulty}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            {!revealed ? (
              <button type="button" className="btn-primary w-full" disabled={selected === null} onClick={confirm}>
                VASTAA
              </button>
            ) : (
              <button type="button" className="btn-primary w-full" onClick={next}>
                {last ? 'Näytä tulos' : 'Seuraava →'}
              </button>
            )}
            {selected !== null && !revealed && (
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                Tyhjennä valinta
              </button>
            )}
          </div>
        }
      />
    </section>
  );
}
