import rawBundle from '@data/bundle.json';
import type { Category, DataBundle, ExamMode, Question, Species } from '@/types';

/**
 * Sovellus toimii ensisijaisesti mukana tulevan datan varassa, joten se toimii
 * myös offline-tilana ilman palvelinta (ohje kohdat 21, 23 ja 45).
 *
 * Palvelimen API:sta voidaan hakea tuoreempi versio (ks. src/lib/api.ts).
 * Tämä moduuli pitää huolen siitä, että käyttöliittymä saa aina dataa.
 */
const bundle = rawBundle as unknown as DataBundle;

let current: DataBundle = bundle;

export function getBundle(): DataBundle {
  return current;
}

/** Vaihtaa käytössä olevan datan, jos palvelimelta saadaan tuoreempi versio. */
export function setBundle(next: DataBundle): void {
  if (next?.questions?.length && next?.categories?.length) current = next;
}

export const categories: Category[] = bundle.categories;
export const questions: Question[] = bundle.questions;
export const species: Species[] = bundle.species;
export const examConfig = bundle.examConfig;

export function categoryById(id: string): Category | undefined {
  return current.categories.find((c) => c.id === id);
}

export function categoryName(id: string): string {
  return categoryById(id)?.short ?? categoryById(id)?.nameFi ?? id;
}

export function categoryIcon(id: string): string {
  return categoryById(id)?.icon ?? '📘';
}

export function getMode(id: 'full' | 'quick'): ExamMode {
  return id === 'quick' ? current.examConfig.quick : current.examConfig.full;
}

/** Kysymykset, jotka ovat voimassa (ohje kohta 32: sisällön versiointi). */
export function activeQuestions(): Question[] {
  return current.questions.filter((q) => !q.validUntil);
}

export function speciesWithImages(): Species[] {
  return current.species.filter((s) => (s.images ?? []).length > 0);
}

export function blankCategories(): Category[] {
  return current.categories.filter((c) => !c.speciesSection);
}
