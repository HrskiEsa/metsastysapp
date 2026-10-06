import { activeQuestions as activeQuestionList, speciesWithImages } from '@/data/bundle';
import type { Question, Species } from '@/types';

/** Voimassa olevat teoriakysymykset (huomioi sisällön versioinnin, ohje kohta 32). */
export function activeQuestions(): Question[] {
  return activeQuestionList();
}

/** Lajit, joille löytyy kuva – vain ne kelpaavat tunnistustehtäviin. */
export function currentSpeciesPool(): Species[] {
  return speciesWithImages();
}
