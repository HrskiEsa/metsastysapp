import { ACHIEVEMENTS } from '@/services/achievements';
import { useProgress } from '@/hooks/useProgress';
import ProgressBar from '@/components/ProgressBar';

export default function Achievements() {
  const { state } = useProgress();
  const unlocked = new Set(state.profile.achievements);
  const percent = Math.round((unlocked.size / ACHIEVEMENTS.length) * 100);

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-xl font-bold">Saavutukset</h1>
        <p className="mt-1 text-sm text-bark-700/70 dark:text-bark-200/60">
          Saavutukset kertyvät harjoittelun myötä. Ne eivät ole pakollisia, mutta auttavat pitämään rutiinin yllä.
        </p>
        <div className="mt-3">
          <ProgressBar label={`Avattu ${unlocked.size}/${ACHIEVEMENTS.length}`} value={percent} />
        </div>
      </section>

      <ul className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          return (
            <li
              key={a.id}
              className={`card flex items-center gap-3 ${isUnlocked ? '' : 'opacity-60'}`}
              aria-label={`${a.title} – ${isUnlocked ? 'avattu' : 'ei avattu'}`}
            >
              <span aria-hidden className="text-3xl">
                {isUnlocked ? a.icon : '🔒'}
              </span>
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-bark-700/70 dark:text-bark-200/60">{a.description}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                  {isUnlocked ? 'Avattu' : 'Ei vielä avattu'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="card">
        <p className="text-sm">
          Harjoitusputki: <strong>{state.profile.streak} pv</strong> · Kokemuspisteet:{' '}
          <strong>{state.profile.xp} XP</strong>
        </p>
      </div>
    </div>
  );
}
