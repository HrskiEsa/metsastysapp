import { useEffect, useState } from 'react';
import { formatClock } from '@/services/examEngine';

interface Props {
  /** Aikaleima, jolloin aika päättyy (Date.now() + kesto). */
  endAt: number;
  onExpire?: () => void;
  label?: string;
}

/**
 * Aika lasketaan aina aikaleimasta (endAt - Date.now()), ei laskurin varassa,
 * joten välilehden vaihto tai selaimen jäätyminen ei riko kelloa (ohje kohta 27).
 */
export default function Timer({ endAt, onExpire, label }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endAt - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, endAt - Date.now()));
    const id = setInterval(() => {
      const left = Math.max(0, endAt - Date.now());
      setRemaining(left);
      if (left <= 0 && onExpire) onExpire();
    }, 500);
    return () => clearInterval(id);
  }, [endAt, onExpire]);

  const urgent = remaining < 5 * 60 * 1000;

  return (
    <span
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold tabular-nums ${
        urgent ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-bark-100 dark:bg-bark-800'
      }`}
    >
      <span aria-hidden>⏱</span>
      {formatClock(remaining)}
      <span className="sr-only">{label ?? 'Aikaa jäljellä'}</span>
    </span>
  );
}
