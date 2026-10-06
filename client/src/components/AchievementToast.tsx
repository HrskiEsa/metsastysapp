import { useEffect } from 'react';
import { ACHIEVEMENTS } from '@/services/achievements';
import { useProgress } from '@/hooks/useProgress';
import type { Achievement } from '@/types';

export default function AchievementToast() {
  const { celebrate, clearCelebrate } = useProgress();
  const achievements = celebrate
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is Achievement => Boolean(a));

  useEffect(() => {
    if (!celebrate.length) return;
    const timer = setTimeout(clearCelebrate, 4000);
    return () => clearTimeout(timer);
  }, [celebrate, clearCelebrate]);

  if (!achievements.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md animate-fade-in rounded-2xl border border-brand-300 bg-white p-3 shadow-lg md:bottom-6 dark:border-brand-700 dark:bg-bark-900"
    >
      {achievements.map((a) => (
        <div key={a.id} className="flex items-center gap-3">
          <span aria-hidden className="text-2xl">
            {a.icon}
          </span>
          <div>
            <p className="text-sm font-bold">Saavutus avattu: {a.title}</p>
            <p className="text-xs text-bark-700/70 dark:text-bark-200/60">{a.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
