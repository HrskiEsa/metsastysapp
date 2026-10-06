import type { ExamHistoryEntry, ProgressState, QuestionStat, SpeciesStat } from '@/types';
import { scheduleNext } from './spacedRepetition';
import { evaluateAchievements } from './achievements';
import { readStore, writeStore, STORAGE_KEYS } from '@/lib/storage';

/** XP-kertymä: oikea vastaus palkitsee enemmän kuin väärä yritys. */
export const XP = { questionCorrect: 3, questionWrong: 1, speciesCorrect: 4, speciesWrong: 1 };

export function newUserId(): string {
  const existing = readStore<string | null>('userId', null);
  if (existing) return existing;
  const id = `guest-${Math.random().toString(36).slice(2, 10)}`;
  writeStore('userId', id);
  return id;
}

export function defaultProgress(): ProgressState {
  return {
    version: 1,
    userId: newUserId(),
    updatedAt: new Date().toISOString(),
    questionStats: {},
    speciesStats: {},
    exams: [],
    profile: { name: 'Metsästäjä', xp: 0, streak: 0, achievements: [] },
  };
}

export function loadProgress(): ProgressState {
  const stored = readStore<ProgressState | null>(STORAGE_KEYS.progress, null);
  if (!stored) return defaultProgress();
  return { ...defaultProgress(), ...stored, profile: { ...defaultProgress().profile, ...stored.profile } };
}

export function saveProgress(state: ProgressState): void {
  writeStore(STORAGE_KEYS.progress, state);
}

const dayKey = (d: Date | string = new Date()) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
};

export function computeStreak(state: ProgressState, today = new Date()): number {
  const last = state.profile.lastPracticeDate;
  if (!last) return 0;
  const diffDays = Math.round((new Date(dayKey(today)).getTime() - new Date(dayKey(last)).getTime()) / 86400000);
  if (diffDays <= 0) return Math.max(1, state.profile.streak);
  if (diffDays === 1) return state.profile.streak + 1;
  return 1;
}

function touchProfile(state: ProgressState, xpGain: number, speciesTotal: number, correctNow: boolean): ProgressState {
  const today = dayKey();
  const alreadyToday = state.profile.lastPracticeDate === today;
  const streak = alreadyToday ? Math.max(1, state.profile.streak) : computeStreak(state);

  const next: ProgressState = {
    ...state,
    updatedAt: new Date().toISOString(),
    profile: {
      ...state.profile,
      xp: state.profile.xp + xpGain,
      streak,
      lastPracticeDate: today,
      achievements: [...state.profile.achievements],
    },
  };

  // Saavutukset arvioidaan uudelleen jokaisen vastauksen jälkeen.
  const unlocked = evaluateAchievements({ ...next, profile: { ...next.profile, streak } }, speciesTotal);
  next.profile.achievements = [...new Set([...state.profile.achievements, ...unlocked])];
  if (correctNow) next.profile.lastPracticeDate = today;
  return next;
}

export function recordQuestionAnswer(
  state: ProgressState,
  questionId: string,
  correct: boolean,
  responseTimeMs: number,
  speciesTotal: number,
): ProgressState {
  const prev: QuestionStat = state.questionStats[questionId] ?? { attempts: 0, correct: 0, wrong: 0 };
  const { dueAt, intervalIndex } = scheduleNext(prev, correct);
  const attempts = prev.attempts + 1;
  const avg = prev.averageResponseTimeMs
    ? Math.round((prev.averageResponseTimeMs * prev.attempts + responseTimeMs) / attempts)
    : responseTimeMs;

  const stat: QuestionStat = {
    attempts,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    lastAnswered: new Date().toISOString(),
    averageResponseTimeMs: avg,
    dueAt,
    intervalIndex,
  };

  return touchProfile(
    { ...state, questionStats: { ...state.questionStats, [questionId]: stat } },
    correct ? XP.questionCorrect : XP.questionWrong,
    speciesTotal,
    correct,
  );
}

export function recordSpeciesAnswer(
  state: ProgressState,
  speciesId: string,
  correct: boolean,
  speciesTotal: number,
): ProgressState {
  const prev: SpeciesStat = state.speciesStats[speciesId] ?? { attempts: 0, correct: 0, wrong: 0 };
  const stat: SpeciesStat = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    lastAnswered: new Date().toISOString(),
  };
  return touchProfile(
    { ...state, speciesStats: { ...state.speciesStats, [speciesId]: stat } },
    correct ? XP.speciesCorrect : XP.speciesWrong,
    speciesTotal,
    correct,
  );
}

export function addExamResult(state: ProgressState, entry: ExamHistoryEntry, speciesTotal: number): ProgressState {
  const exams = [...state.exams, entry].slice(-100);
  const xpGain = Math.round(entry.correct * 2);
  const next = touchProfile({ ...state, exams }, xpGain, speciesTotal, true);
  const unlocked = evaluateAchievements(next, speciesTotal);
  next.profile.achievements = [...new Set([...next.profile.achievements, ...unlocked])];
  return next;
}

export function resetProgress(): ProgressState {
  return defaultProgress();
}
