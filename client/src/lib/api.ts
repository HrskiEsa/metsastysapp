import type { DataBundle, ProgressState } from '@/types';
import { setBundle } from '@/data/bundle';

/**
 * Sovellus toimii offline-first-periaatteella: data on mukana buildissa.
 * Palvelin tarjoaa tuoreemman sisällön ja edistymisen synkronoinnin,
 * mutta mikään ei hajoa, jos palvelin ei ole tavoitettavissa.
 */
const TIMEOUT_MS = 4000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  async health(): Promise<boolean> {
    try {
      await request('/api/health');
      return true;
    } catch {
      return false;
    }
  },

  /** Hakee tuoreimman sisältöpaketin palvelimelta. */
  async refreshBundle(): Promise<DataBundle | null> {
    try {
      const bundle = await request<DataBundle>('/api/bundle');
      if (bundle?.questions?.length) {
        setBundle(bundle);
        return bundle;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** Lähettää paikallisen edistymisen palvelimelle (guest → tili -synkronointi). */
  async syncProgress(state: ProgressState): Promise<ProgressState | null> {
    try {
      return await request<ProgressState>(`/api/progress/${encodeURIComponent(state.userId)}`, {
        method: 'PUT',
        body: JSON.stringify(state),
      });
    } catch {
      return null;
    }
  },

  async fetchProgress(userId: string): Promise<ProgressState | null> {
    try {
      return await request<ProgressState>(`/api/progress/${encodeURIComponent(userId)}`);
    } catch {
      return null;
    }
  },

  async importQuestions(questions: unknown[], dryRun = false) {
    return request<{ imported?: number; accepted?: number; rejected: number; errors: string[] }>('/api/admin/import', {
      method: 'POST',
      body: JSON.stringify({ questions, dryRun }),
    });
  },
};
