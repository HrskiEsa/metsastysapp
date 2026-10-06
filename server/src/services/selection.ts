import type { ExamMode, Question, Species, DataBundle } from '../types.js';

/** Deterministic PRNG (mulberry32) so a paper can be reproduced from a seed. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Valitsee teoriakysymykset aihealueittain konfiguroidun jakauman mukaan (ohje kohta 11).
 * Jakauma ei ole kovakoodattu, vaan tulee data/exam-config.json-tiedostosta.
 */
export function selectTheoryQuestions(
  all: Question[],
  mode: ExamMode,
  distribution: Record<string, number>,
  rng: () => number,
): Question[] {
  const picked: Question[] = [];
  const used = new Set<string>();

  for (const [category, count] of Object.entries(distribution)) {
    if (category.startsWith('$')) continue;
    const pool = all.filter((q) => q.category === category && q.validUntil == null);
    const want = Math.max(0, Math.min(count, pool.length));
    for (const q of shuffle(pool, rng).slice(0, want)) {
      if (!used.has(q.id)) {
        picked.push(q);
        used.add(q.id);
      }
    }
  }

  // Jos jakauma ei täytä tavoitemäärää, täydennetään muilla kysymyksillä.
  if (picked.length < mode.theoryCount) {
    const rest = all.filter((q) => !used.has(q.id) && q.validUntil == null);
    for (const q of shuffle(rest, rng)) {
      if (picked.length >= mode.theoryCount) break;
      picked.push(q);
      used.add(q.id);
    }
  }

  return shuffle(picked, rng).slice(0, mode.theoryCount);
}

/** Valitsee lajintunnistustehtävät lajiryhmittäin (linnut / nisäkkäät). */
export function selectSpecies(
  all: Species[],
  mode: ExamMode,
  distribution: Record<string, number>,
  rng: () => number,
): Species[] {
  const withImages = all.filter((s) => (s.images ?? []).length > 0);
  const picked: Species[] = [];
  const used = new Set<string>();

  for (const [type, count] of Object.entries(distribution)) {
    if (type.startsWith('$')) continue;
    const pool = withImages.filter((s) => s.type === type);
    for (const s of shuffle(pool, rng).slice(0, Math.max(0, count))) {
      if (!used.has(s.id)) {
        picked.push(s);
        used.add(s.id);
      }
    }
  }

  if (picked.length < mode.speciesCount) {
    const rest = withImages.filter((s) => !used.has(s.id));
    for (const s of shuffle(rest, rng)) {
      if (picked.length >= mode.speciesCount) break;
      picked.push(s);
      used.add(s.id);
    }
  }

  return shuffle(picked, rng).slice(0, mode.speciesCount);
}

/** Arpoo yhden kuvan lajin tunnistuskuvista (deterministisesti rng:llä). */
function pickImage(species: Species, rng: () => number) {
  const images = species.images ?? [];
  if (!images.length) return null;
  return images[Math.floor(rng() * images.length)];
}

export function buildExamPaper(bundle: DataBundle, mode: ExamMode, seed = Date.now()) {
  const rng = makeRng(seed);
  const theory = selectTheoryQuestions(bundle.questions, mode, bundle.examConfig.distribution, rng);
  const species = selectSpecies(bundle.species, mode, bundle.examConfig.speciesDistribution, rng);
  return {
    seed,
    mode: mode.id,
    meta: mode,
    disclaimer: bundle.examConfig.disclaimer,
    theory: theory.map((q) => ({
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      question: q.question,
      answers: q.answers.map((a, i) => ({ index: i, text: a.text })),
      source: q.source,
    })),
    species: species.map((s) => {
      // Kuva arvotaan lajin kaikista tunnistuskuvista: sama laji voi tulla
      // eri kuvalla eri kokeissa, mikä harjaannuttaa tunnistamista.
      const image = pickImage(s, rng);
      return {
        id: s.id,
        type: s.type,
        group: s.group,
        image_url: image?.image_url ?? null,
        attribution: image?.attribution ?? null,
      };
    }),
  };
}
