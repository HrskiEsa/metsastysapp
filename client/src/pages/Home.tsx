import { Link, useNavigate } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import { buildSummary, recommendNext, weeklyActivity } from '@/services/statistics';
import ProgressBar from '@/components/ProgressBar';
import CategoryBar from '@/components/CategoryBar';
import { getBundle } from '@/data/bundle';

export default function Home() {
  const { state, speciesTotal } = useProgress();
  const navigate = useNavigate();
  const summary = buildSummary(state);
  const recommendation = recommendNext(state);
  const week = weeklyActivity(state);
  const examConfig = getBundle().examConfig;

  const answered = summary.overall.attempts > 0;

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-bold">Tervetuloa takaisin, {state.profile.name}!</h1>
        <p className="mt-0.5 text-sm text-bark-700/70 dark:text-bark-200/60">
          {answered
            ? 'Jatka siitä, mihin jäit. Kertaus on tehokkainta silloin, kun se tehdään säännöllisesti.'
            : 'Aloita ensimmäisellä harjoituksella – sovellus oppii osaamisestasi vasta vastausten myötä.'}
        </p>

        <div className="mt-4">
          <ProgressBar
            label="Kokonaisosaaminen"
            value={summary.overall.percent}
            color={answered ? undefined : 'brand'}
          />
          {!answered && (
            <p className="mt-1 text-xs text-bark-700/60 dark:text-bark-200/50">
              Ei vielä vastauksia – tavoitteena on kattava osaaminen kaikilla kahdeksalla aihealueella.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-bark-100 p-2 dark:bg-bark-800">
            <p className="tabular-nums text-lg font-bold">{summary.theory.percent} %</p>
            <p className="text-[11px]">Teoria</p>
          </div>
          <div className="rounded-xl bg-bark-100 p-2 dark:bg-bark-800">
            <p className="tabular-nums text-lg font-bold">{summary.species.percent} %</p>
            <p className="text-[11px]">Lajintuntemus</p>
          </div>
          <div className="rounded-xl bg-bark-100 p-2 dark:bg-bark-800">
            <p className="tabular-nums text-lg font-bold">{summary.exams.percent} %</p>
            <p className="text-[11px]">Harjoituskokeet</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link to="/practice?mode=all" className="btn-primary flex-1">
            ▶ Jatka harjoittelua
          </Link>
          <Link to="/exam" className="btn-secondary flex-1">
            📝 Harjoituskoe
          </Link>
        </div>
      </section>

      {recommendation && (
        <section className="card border-brand-300 dark:border-brand-700">
          <p className="label">🎯 Paranna tulostasi</p>
          <h2 className="mt-1 font-bold">Suositus: {recommendation.category.nameFi}</h2>
          <p className="mt-1 text-sm text-bark-700/80 dark:text-bark-200/70">{recommendation.reason}</p>
          {summary.weakCount > 0 && (
            <p className="mt-1 text-sm">
              Löysimme <strong>{summary.weakCount}</strong> kysymystä, joissa onnistumisprosenttisi on alle 60 %.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => navigate(`/practice?mode=category&category=${recommendation.categoryId}`)}
            >
              Harjoittele: {recommendation.category.short}
            </button>
            {summary.weakCount > 0 && (
              <button type="button" className="btn-secondary flex-1" onClick={() => navigate('/practice?mode=weak')}>
                Harjoittele heikoimpia
              </button>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">🔥 Päivän harjoitus</p>
            <h2 className="mt-1 font-bold">10 teoriakysymystä + 5 lajintunnistusta</h2>
            <p className="text-sm text-bark-700/70 dark:text-bark-200/60">Arvioitu aika noin 10 minuuttia.</p>
          </div>
          <span className="text-3xl" aria-hidden>
            📅
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link to="/practice?mode=daily" className="btn-primary flex-1">
            Aloita
          </Link>
          <span className="chip" title="Viikon aktiivisuus">
            {week.reduce((s, d) => s + d.count, 0)} vastausta / 7 pv
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-1" aria-hidden>
          {week.map((day) => {
            const max = Math.max(1, ...week.map((d) => d.count));
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand-500/70"
                  style={{ height: `${Math.max(4, (day.count / max) * 40)}px` }}
                />
                <span className="text-[10px] text-bark-700/60 dark:text-bark-200/50">{day.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Aihealueet</h2>
          <Link to="/statistics" className="text-sm font-semibold text-brand-700 dark:text-brand-400">
            Kaikki tilastot →
          </Link>
        </div>
        <div className="space-y-2">
          {summary.categories.map(({ category, accuracy }) => (
            <CategoryBar
              key={category.id}
              category={category}
              percent={accuracy.percent}
              attempts={accuracy.attempts}
              to={`/practice?mode=category&category=${category.id}`}
            />
          ))}
          <CategoryBar
            category={getBundle().categories.find((c) => c.speciesSection)!}
            percent={summary.species.percent}
            attempts={summary.species.attempts}
            to="/species"
          />
        </div>
      </section>

      <section className="card">
        <p className="label">Lajintuntemus</p>
        <p className="mt-1 text-sm">
          Olet tunnistanut <strong>{summary.speciesCoverage.recognised}</strong> / {speciesTotal} lajia oikein. Kuvat
          ovat Wikimedia Commonsista ja jokaisen kuvan lisenssitiedot löytyvät lajin tiedoista.
        </p>
        <Link to="/species" className="btn-secondary mt-3 w-full">
          🦌 Harjoittele lajintuntemusta
        </Link>
      </section>

      <section className="card">
        <p className="label">📋 Tietoa tutkinnosta</p>
        <ul className="mt-2 space-y-1 text-sm text-bark-700/80 dark:text-bark-200/70">
          <li>• Virallinen koe: 60 kysymystä, joista 15 lajintuntemustehtävää (tehdään ensin, aikaa 15 min)</li>
          <li>• Koko kokeeseen aikaa enintään 1,5 tuntia</li>
          <li>• Hyväksytty: <strong>vääriä vastauksia enintään 8</strong> (vähintään 52/60 oikein)</li>
          <li>• Koemaksu 20 € · vastauskieli: suomi, ruotsi, saame tai englanti</li>
          <li>• Riistanhoitomaksu joka metsästysvuodelta – 5 vuoden tauko vanhentaa tutkinnon</li>
        </ul>
        <p className="mt-2 text-xs text-bark-700/60 dark:text-bark-200/50">
          Lähde: Suomen riistakeskus (riista.fi). Harjoittele aina ajantasaisen Metsästäjän oppaan mukaan.
        </p>
      </section>

      <p className="px-1 text-center text-[11px] leading-relaxed text-bark-700/60 dark:text-bark-200/50">
        {examConfig.disclaimer} Harjoittele viralliseen tutkintoon aina ajantasaisen Metsästäjän oppaan mukaan.
      </p>
    </div>
  );
}
