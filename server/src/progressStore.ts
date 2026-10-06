import fs from 'node:fs';
import path from 'node:path';
import { ensureProgressDirs, progressDir } from './data.js';
import type { ProgressSnapshot } from './types.js';

/**
 * MVP-tason tallennus: JSON-tiedosto per käyttäjä.
 * Tuotannossa tämä korvataan PostgreSQL:llä (ohje kohta 28) – rajapinta pysyy samana.
 */
function fileFor(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'guest';
  return path.join(progressDir, `progress-${safe}.json`);
}

export function readProgress(userId: string): ProgressSnapshot | null {
  ensureProgressDirs();
  const file = fileFor(userId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as ProgressSnapshot;
  } catch {
    return null;
  }
}

export function writeProgress(snapshot: ProgressSnapshot): ProgressSnapshot {
  ensureProgressDirs();
  const file = fileFor(snapshot.userId);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  return snapshot;
}

function mergeQuestionStats(a: ProgressSnapshot | null, b: ProgressSnapshot) {
  const base = { ...(a?.questionStats ?? {}) };
  for (const [id, stat] of Object.entries(b.questionStats ?? {})) {
    const prev = base[id];
    if (!prev || (stat.attempts ?? 0) >= (prev.attempts ?? 0)) base[id] = { ...prev, ...stat };
  }
  return base;
}

function mergeSpeciesStats(a: ProgressSnapshot | null, b: ProgressSnapshot) {
  const base = { ...(a?.speciesStats ?? {}) };
  for (const [id, stat] of Object.entries(b.speciesStats ?? {})) {
    const prev = base[id];
    if (!prev || (stat.attempts ?? 0) >= (prev.attempts ?? 0)) base[id] = { ...prev, ...stat };
  }
  return base;
}

/** Yhdistää paikallisen (guest) datan palvelimella olevaan dataan. */
export function mergeProgress(incoming: ProgressSnapshot): ProgressSnapshot {
  const existing = readProgress(incoming.userId);
  const examMap = new Map<string, ProgressSnapshot['exams'][number]>();
  for (const e of [...(existing?.exams ?? []), ...(incoming.exams ?? [])]) examMap.set(e.id, e);

  const merged: ProgressSnapshot = {
    userId: incoming.userId,
    updatedAt: new Date().toISOString(),
    questionStats: mergeQuestionStats(existing, incoming),
    speciesStats: mergeSpeciesStats(existing, incoming),
    exams: [...examMap.values()].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt)).slice(-200),
    profile: {
      ...existing?.profile,
      ...incoming.profile,
      xp: Math.max(existing?.profile?.xp ?? 0, incoming.profile?.xp ?? 0),
      streak: Math.max(existing?.profile?.streak ?? 0, incoming.profile?.streak ?? 0),
    },
  };
  return writeProgress(merged);
}
