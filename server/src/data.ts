import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataBundle, Question, Species, Category, ExamConfig } from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..', '..');
const dataDir = path.join(repoRoot, 'data');
const bundlePath = path.join(dataDir, 'bundle.json');

let cached: DataBundle | null = null;

export function loadBundle(): DataBundle {
  if (cached) return cached;
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`data/bundle.json puuttuu. Aja ensin: npm run data (${bundlePath})`);
  }
  cached = JSON.parse(fs.readFileSync(bundlePath, 'utf8')) as DataBundle;
  return cached;
}

export function reloadBundle(): DataBundle {
  cached = null;
  return loadBundle();
}

export const getCategories = (): Category[] => loadBundle().categories;
export const getQuestions = (): Question[] => loadBundle().questions;
export const getSpecies = (): Species[] => loadBundle().species;
export const getExamConfig = (): ExamConfig => loadBundle().examConfig;

export function findQuestion(id: string): Question | undefined {
  return getQuestions().find((q) => q.id === id);
}

export function findSpecies(id: string): Species | undefined {
  return getSpecies().find((s) => s.id === id);
}

export const progressDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(repoRoot, 'server', '.data');
export const uploadsDir = path.join(progressDir, 'uploads');
export const questionsDir = path.join(dataDir, 'questions');

export function ensureProgressDirs(): void {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Kirjoittaa kysymysbankin tiedostoihin ja rakentaa data/bundle.json uudelleen.
 * Käytetään admin-importissa (ohje kohta 30), jotta uusi sisältö tulee heti käyttöön.
 */
export function rebuildBundle(): DataBundle {
  const categories = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf8')) as Category[];
  categories.sort((a, b) => a.order - b.order);
  const examConfig = JSON.parse(fs.readFileSync(path.join(dataDir, 'exam-config.json'), 'utf8')) as ExamConfig;

  const questions = fs
    .readdirSync(questionsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8')) as Question[]);

  const order = new Map(categories.map((c, i) => [c.id, i]));
  questions.sort(
    (a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99) || a.id.localeCompare(b.id),
  );

  const speciesFile = fs.existsSync(path.join(dataDir, 'species.json')) ? 'species.json' : 'species.seed.json';
  const species = JSON.parse(fs.readFileSync(path.join(dataDir, speciesFile), 'utf8')) as Species[];

  const bundle: DataBundle = {
    generatedAt: new Date().toISOString(),
    version: 1,
    categories,
    examConfig,
    questions,
    species,
    stats: {
      categories: categories.length,
      questions: questions.length,
      species: species.length,
      speciesWithImages: species.filter((s) => (s.images ?? []).length > 0).length,
      speciesImageSource: speciesFile,
    },
  };

  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  reloadBundle();
  return bundle;
}
