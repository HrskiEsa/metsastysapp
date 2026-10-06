import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ExamResult } from '@/services/examEngine';
import type { ExamHistoryEntry, ProgressState } from '@/types';
import {
  addExamResult,
  loadProgress,
  recordQuestionAnswer,
  recordSpeciesAnswer,
  resetProgress,
  saveProgress,
} from '@/services/progress';
import { currentSpeciesPool } from '@/services/pool';
import { ACHIEVEMENTS } from '@/services/achievements';
import { api } from '@/lib/api';

interface ProgressContextValue {
  state: ProgressState;
  speciesTotal: number;
  celebrate: string[];
  clearCelebrate: () => void;
  answerQuestion: (questionId: string, correct: boolean, responseTimeMs?: number) => void;
  answerSpecies: (speciesId: string, correct: boolean) => void;
  saveExam: (result: ExamResult) => void;
  setName: (name: string) => void;
  reset: () => void;
  syncNow: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadProgress());
  const [celebrate, setCelebrate] = useState<string[]>([]);
  const speciesTotal = currentSpeciesPool().length;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tallennetaan paikallisesti jokaisen muutoksen jälkeen (guest-tila, ohje kohta 20).
  useEffect(() => {
    saveProgress(state);
  }, [state]);

  // Taustasynkronointi palvelimelle, jos se on tavoitettavissa.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const merged = await api.syncProgress(stateRef.current);
      if (merged && !cancelled) {
        setState((prev) => ({ ...prev, exams: merged.exams.length ? merged.exams : prev.exams }));
      }
    };
    const timer = setTimeout(run, 3000);
    const interval = setInterval(run, 120000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const announce = useCallback((before: string[], after: string[]) => {
    const fresh = after.filter((id) => !before.includes(id));
    if (fresh.length) setCelebrate(fresh);
  }, []);

  const answerQuestion = useCallback(
    (questionId: string, correct: boolean, responseTimeMs = 0) => {
      setState((prev) => {
        const next = recordQuestionAnswer(prev, questionId, correct, responseTimeMs, speciesTotal);
        announce(prev.profile.achievements, next.profile.achievements);
        return next;
      });
    },
    [announce, speciesTotal],
  );

  const answerSpecies = useCallback(
    (speciesId: string, correct: boolean) => {
      setState((prev) => {
        const next = recordSpeciesAnswer(prev, speciesId, correct, speciesTotal);
        announce(prev.profile.achievements, next.profile.achievements);
        return next;
      });
    },
    [announce, speciesTotal],
  );

  const saveExam = useCallback(
    (result: ExamResult) => {
      const entry: ExamHistoryEntry = {
        id: result.examId,
        mode: result.mode,
        startedAt: new Date(Date.now() - result.durationSeconds * 1000).toISOString(),
        finishedAt: new Date().toISOString(),
        totalQuestions: result.total,
        correct: result.correct,
        percent: result.percent,
        passed: result.passed,
        durationSeconds: result.durationSeconds,
        categoryBreakdown: result.categoryBreakdown,
      };
      setState((prev) => {
        const next = addExamResult(prev, entry, speciesTotal);
        announce(prev.profile.achievements, next.profile.achievements);
        return next;
      });
    },
    [announce, speciesTotal],
  );

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, name } }));
  }, []);

  const reset = useCallback(() => {
    setState(resetProgress());
    setCelebrate([]);
  }, []);

  const syncNow = useCallback(async () => {
    await api.syncProgress(stateRef.current);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      state,
      speciesTotal,
      celebrate,
      clearCelebrate: () => setCelebrate([]),
      answerQuestion,
      answerSpecies,
      saveExam,
      setName,
      reset,
      syncNow,
    }),
    [state, speciesTotal, celebrate, answerQuestion, answerSpecies, saveExam, setName, reset, syncNow],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress on käytettävä ProgressProviderin sisällä');
  return ctx;
}

export function achievementById(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
