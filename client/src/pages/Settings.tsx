import { useEffect, useState } from 'react';
import { useProgress } from '@/hooks/useProgress';
import { useSettings, type ThemeChoice } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { exportAll } from '@/lib/storage';
import { loadProgress, saveProgress } from '@/services/progress';
import { getBundle } from '@/data/bundle';
import type { ProgressState } from '@/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function Settings() {
  const { state, setName, reset, syncNow } = useProgress();
  const { settings, update } = useSettings();
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const bundle = getBundle();

  useEffect(() => {
    void api.health().then(setServerUp);
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(loadProgress(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metsastaja-edistyminen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProgressState;
        if (!parsed || typeof parsed !== 'object' || !parsed.profile) throw new Error('virheellinen tiedosto');
        saveProgress(parsed);
        setStatus('Edistyminen tuotu. Lataa sivu uudelleen, niin tiedot näkyvät.');
      } catch {
        setStatus('Tiedoston lukeminen epäonnistui – tarkista että se on sovelluksen viemä JSON.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Asetukset</h1>

      <section className="card space-y-3">
        <h2 className="font-bold">Profiili</h2>
        <label className="block">
          <span className="label">Nimi</span>
          <input
            type="text"
            value={state.profile.name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-bark-200 bg-white px-3 py-2 dark:border-bark-700 dark:bg-bark-900"
          />
        </label>
        <p className="text-xs text-bark-700/60 dark:text-bark-200/50">
          Käytät sovellusta vierastilassa (guest). Edistyminen tallennetaan tähän selaimeen, ja se voidaan siirtää
          tilille myöhemmin.
        </p>
      </section>

      <section className="card">
        <h2 className="font-bold">Ulkoasu</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { id: 'light', label: '☀️ Vaalea' },
              { id: 'dark', label: '🌙 Tumma' },
              { id: 'system', label: '⚙️ Järjestelmän mukaan' },
            ] as { id: ThemeChoice; label: string }[]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => update({ theme: option.id })}
              className={`chip ${settings.theme === option.id ? 'border-brand-600 bg-brand-50 font-bold dark:bg-brand-950' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Värinäpäytys oikeassa vastauksessa</span>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => update({ haptics: e.target.checked })}
            className="h-6 w-6 accent-brand-600"
          />
        </label>
      </section>

      <section className="card">
        <h2 className="font-bold">Tavoitteet</h2>
        <label className="mt-2 block">
          <span className="label">Päivittäinen tavoite (kysymystä)</span>
          <input
            type="number"
            min={5}
            max={100}
            step={5}
            value={settings.dailyGoal}
            onChange={(e) => update({ dailyGoal: Number(e.target.value) })}
            className="mt-1 w-32 rounded-xl border border-bark-200 bg-white px-3 py-2 dark:border-bark-700 dark:bg-bark-900"
          />
        </label>
      </section>

      <section className="card">
        <h2 className="font-bold">Palvelin ja synkronointi</h2>
        <p className="mt-1 text-sm">
          Tila:{' '}
          {serverUp === null ? (
            <span>Tarkistetaan…</span>
          ) : serverUp ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">✓ Yhdistetty</span>
          ) : (
            <span className="font-semibold text-amber-700 dark:text-amber-400">Offline-tila (paikallinen data)</span>
          )}
        </p>
        <p className="mt-1 text-xs text-bark-700/60 dark:text-bark-200/50">
          Sovellus toimii täysin ilman palvelinta. Palvelin tarjoaa tuoreimman sisällön ja edistymisen synkronoinnin.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={async () => {
              await syncNow();
              setStatus('Edistyminen synkronoitu palvelimelle.');
            }}
          >
            Synkronoi nyt
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={async () => {
              const bundleNow = await api.refreshBundle();
              setStatus(bundleNow ? 'Sisältö päivitetty palvelimelta.' : 'Palvelinta ei tavoitettu.');
            }}
          >
            Päivitä sisältö
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="font-bold">Omat tiedot</h2>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" onClick={downloadJson}>
            ⬇️ Vie edistyminen (JSON)
          </button>
          <label className="btn-secondary flex-1 cursor-pointer">
            ⬆️ Tuo edistyminen
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importProgress(e.target.files[0])}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn-secondary mt-2 w-full !border-red-300 !text-red-700 dark:!text-red-400"
          onClick={() => {
            if (confirm('Nollataanko kaikki edistyminen? Tätä ei voi perua.')) reset();
          }}
        >
          Nollaa edistyminen
        </button>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-semibold">Näytä kaikki tallennettu data (GDPR)</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-bark-100 p-2 dark:bg-bark-800">
            {exportAll()}
          </pre>
        </details>
      </section>

      <section className="card">
        <h2 className="font-bold">Asenna sovellus puhelimeen</h2>
        <p className="mt-1 text-sm text-bark-700/70 dark:text-bark-200/60">
          Tämä on PWA eli asennettava verkkosovellus. Se toimii myös offline-tilassa, ja teoria sekä kuvat on tallennettu
          laitteellesi.
        </p>
        {installEvent ? (
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={async () => {
              await installEvent.prompt();
              setInstallEvent(null);
            }}
          >
            📱 Lisää aloitusnäyttöön
          </button>
        ) : (
          <p className="mt-2 text-xs text-bark-700/60 dark:text-bark-200/50">
            Avaa selaimen valikko ja valitse “Lisää aloitusnäyttöön” (iOS: Jaa → Lisää Koti-valikkoon).
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="font-bold">Tietoa sovelluksesta</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Versio: {bundle.version}.0 · data päivitetty {new Date(bundle.generatedAt).toLocaleDateString('fi-FI')}</li>
          <li>Kysymyksiä: {bundle.stats.questions} kpl</li>
          <li>Lajeja: {bundle.stats.species} kpl ({bundle.stats.speciesWithImages} kuvalla)</li>
          <li>Aihealueita: {bundle.stats.categories} kpl</li>
        </ul>
        {bundle.examConfig.officialExam && (
          <p className="mt-2 text-xs leading-relaxed text-bark-700/70 dark:text-bark-200/60">
            Kokeen rakenne noudattaa Riistakeskuksen määrittelyä (60 kys., 15 lajia, enintään 8 väärää).
            Lähde: riista.fi, luettu {new Date('2026-10-01').toLocaleDateString('fi-FI')}.
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-bark-700/70 dark:text-bark-200/60">
          <strong>Kuvat:</strong> Wikimedia Commons, vapaasti lisensoidut (CC BY, CC BY-SA, CC0 tai public domain).
          Jokaisen kuvan kuvaaja, lisenssi ja lähdesivu näytetään lajin tiedoissa ja tallennetaan tietokantaan.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-bark-700/70 dark:text-bark-200/60">
          <strong>Vastuuvapauslauseke:</strong> {bundle.examConfig.disclaimer} Kysymyspankki on tarkoitettu
          harjoitteluun, ja sisältö on tarkistettava aina ajantasaisesta Metsästäjän oppaasta ja Riistakeskuksen
          ohjeista.
        </p>
      </section>

      {status && (
        <p role="status" className="card text-sm">
          {status}
        </p>
      )}
    </div>
  );
}
