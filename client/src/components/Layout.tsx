import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import AchievementToast from './AchievementToast';

const NAV = [
  { to: '/', label: 'Etusivu', icon: '🏠' },
  { to: '/practice', label: 'Harjoittele', icon: '🎯' },
  { to: '/species', label: 'Lajit', icon: '🦌' },
  { to: '/exam', label: 'Koe', icon: '📝' },
  { to: '/statistics', label: 'Tilastot', icon: '📊' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { state } = useProgress();
  const location = useLocation();
  const isExamRunning = location.pathname === '/exam';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
      <header
        className="sticky top-0 z-20 border-b border-bark-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-bark-800 dark:bg-bark-950/90"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2">
            <span aria-hidden className="text-2xl">
              🦌
            </span>
            <span className="text-base font-bold leading-tight">
              Metsästäjä-akatemia
              <span className="block text-[11px] font-medium uppercase tracking-wide text-bark-700/60 dark:text-bark-200/50">
                Metsästäjätutkintoon
              </span>
            </span>
          </NavLink>
          <div className="flex items-center gap-2 text-sm">
            <span className="chip" title="Harjoitusputki">
              🔥 {state.profile.streak}
            </span>
            <span className="chip" title="Kokemuspisteet">
              ⭐ {state.profile.xp}
            </span>
          </div>
        </div>

        <nav aria-label="Päävalikko" className="mt-2 hidden gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? 'bg-brand-700 text-white'
                    : 'text-bark-700 hover:bg-bark-100 dark:text-bark-200 dark:hover:bg-bark-800'
                }`
              }
            >
              <span aria-hidden className="mr-1">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `ml-auto rounded-lg px-3 py-2 text-sm font-semibold ${
                isActive ? 'bg-brand-700 text-white' : 'text-bark-700 hover:bg-bark-100 dark:text-bark-200 dark:hover:bg-bark-800'
              }`
            }
          >
            ⚙️ Asetukset
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4 md:pb-10">{children}</main>

      {!isExamRunning && (
        <nav
          aria-label="Pikanavigaatio"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-bark-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-bark-800 dark:bg-bark-950/95"
        >
          <div className="mx-auto flex max-w-3xl">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    isActive ? 'text-brand-700 dark:text-brand-400' : 'text-bark-700/70 dark:text-bark-200/60'
                  }`
                }
              >
                <span aria-hidden className="text-xl">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <AchievementToast />
    </div>
  );
}
