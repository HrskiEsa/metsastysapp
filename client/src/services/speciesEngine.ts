import type { ProgressState, Species } from '@/types';
import { currentSpeciesPool } from './pool';

export type SpeciesType = 'lintu' | 'nisakas';

export function getSpeciesByType(type?: SpeciesType): Species[] {
  const pool = currentSpeciesPool();
  return type ? pool.filter((s) => s.type === type) : pool;
}

export function getSpeciesGroups(): { group: string; type: SpeciesType; count: number }[] {
  const map = new Map<string, { group: string; type: SpeciesType; count: number }>();
  for (const s of currentSpeciesPool()) {
    const entry = map.get(s.group) ?? { group: s.group, type: s.type, count: 0 };
    entry.count += 1;
    map.set(s.group, entry);
  }
  return [...map.values()].sort((a, b) => a.type.localeCompare(b.type) || a.group.localeCompare(b.group));
}

export interface SpeciesMastery {
  species: Species;
  attempts: number;
  correct: number;
  percent: number;
}

export function speciesMastery(state: ProgressState, type?: SpeciesType): SpeciesMastery[] {
  return getSpeciesByType(type)
    .map((species) => {
      const stat = state.speciesStats[species.id];
      const attempts = stat?.attempts ?? 0;
      const correct = stat?.correct ?? 0;
      return { species, attempts, correct, percent: attempts ? Math.round((correct / attempts) * 100) : 0 };
    })
    .sort((a, b) => a.percent - b.percent || a.species.nameFi.localeCompare(b.species.nameFi));
}

/** Lajintuntemuksen kokonaistarkkuus prosentteina. */
export function speciesPercent(state: ProgressState): number {
  const stats = Object.values(state.speciesStats);
  const attempts = stats.reduce((s, x) => s + (x.attempts ?? 0), 0);
  const correct = stats.reduce((s, x) => s + (x.correct ?? 0), 0);
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

export function speciesCoverage(state: ProgressState): { recognised: number; total: number } {
  const total = currentSpeciesPool().length;
  const recognised = currentSpeciesPool().filter((s) => (state.speciesStats[s.id]?.correct ?? 0) > 0).length;
  return { recognised, total };
}

/** Heikoimmin tunnistetut lajit, joita kannattaa harjoitella (ohje kohta 18). */
export function weakestSpecies(state: ProgressState, limit = 6): Species[] {
  return speciesMastery(state)
    .filter((m) => m.attempts > 0 && m.percent < 70)
    .slice(0, limit)
    .map((m) => m.species);
}
