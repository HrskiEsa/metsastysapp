import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ensureProgressDirs, questionsDir, loadBundle, findQuestion, findSpecies, rebuildBundle } from './data.js';
import { buildExamPaper } from './services/selection.js';
import { mergeProgress, readProgress } from './progressStore.js';
import type { Question, ProgressSnapshot } from './types.js';

const HISTORY_LIMIT = 100;

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  app.get('/api/bundle', async (_req, reply) => {
    void reply.header('cache-control', 'no-cache');
    return loadBundle();
  });

  app.get('/api/meta', async () => {
    const b = loadBundle();
    return { generatedAt: b.generatedAt, version: b.version, stats: b.stats, disclaimer: b.examConfig.disclaimer };
  });

  app.get('/api/categories', async () => loadBundle().categories);
  app.get('/api/exam-config', async () => loadBundle().examConfig);

  app.get<{ Querystring: { category?: string; difficulty?: string; limit?: string; q?: string } }>(
    '/api/questions',
    async (req) => {
      const { category, difficulty, limit, q } = req.query;
      let items = loadBundle().questions;
      if (category) items = items.filter((x) => x.category === category);
      if (difficulty) items = items.filter((x) => x.difficulty === Number(difficulty));
      if (q) {
        const needle = q.toLowerCase();
        items = items.filter((x) => x.question.toLowerCase().includes(needle));
      }
      if (limit) items = items.slice(0, Number(limit));
      return { count: items.length, items };
    },
  );

  app.get<{ Params: { id: string } }>('/api/questions/:id', async (req, reply) => {
    const question = findQuestion(req.params.id);
    if (!question) return reply.code(404).send({ error: 'Kysymystä ei löytynyt' });
    return question;
  });

  app.get<{ Querystring: { type?: string; q?: string; huntable?: string } }>('/api/species', async (req) => {
    const { type, q, huntable } = req.query;
    let items = loadBundle().species;
    if (type) items = items.filter((s) => s.type === type);
    if (huntable) items = items.filter((s) => String(s.huntable) === huntable);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((s) =>
        [s.nameFi, s.nameSv, s.nameEn, s.scientific, s.group].some((v) => v.toLowerCase().includes(needle)),
      );
    }
    return { count: items.length, items };
  });

  app.get<{ Params: { id: string } }>('/api/species/:id', async (req, reply) => {
    const species = findSpecies(req.params.id);
    if (!species) return reply.code(404).send({ error: 'Lajia ei löytynyt' });
    return species;
  });

  app.get('/api/images/attribution', async () => ({
    note: 'Kuvat: Wikimedia Commons. Jokaisen kuvan kuvaaja ja lisenssi löytyvät /api/species/:id vastauksesta.',
    items: loadBundle()
      .species.flatMap((s) => (s.images ?? []).map((img) => ({ speciesId: s.id, species: s.nameFi, ...img }))),
  }));

  // Harjoituskokeen paperi generoidaan konfiguroidun jakauman mukaan (ohje kohta 11).
  app.post<{ Body: { mode?: 'full' | 'quick'; seed?: number } }>('/api/exams/paper', async (req, reply) => {
    const bundle = loadBundle();
    const modeId = req.body?.mode === 'quick' ? 'quick' : 'full';
    const mode = bundle.examConfig[modeId];
    if (!mode) return reply.code(400).send({ error: 'Tuntematon koetyyppi' });
    return buildExamPaper(bundle, mode, req.body?.seed ?? Date.now());
  });

  app.get<{ Params: { userId: string } }>('/api/progress/:userId', async (req, reply) => {
    const data = readProgress(req.params.userId);
    if (!data) return reply.code(404).send({ error: 'Ei tallennettua edistymistä' });
    return data;
  });

  app.put<{ Params: { userId: string }; Body: ProgressSnapshot }>('/api/progress/:userId', async (req, reply) => {
    const body = req.body;
    if (!body || typeof body !== 'object') return reply.code(400).send({ error: 'Virheellinen edistymisdata' });
    const snapshot: ProgressSnapshot = {
      userId: req.params.userId,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
      questionStats: body.questionStats ?? {},
      speciesStats: body.speciesStats ?? {},
      exams: (body.exams ?? []).slice(-HISTORY_LIMIT),
      profile: body.profile ?? { xp: 0, streak: 0 },
    };
    return mergeProgress(snapshot);
  });

  app.get<{ Params: { userId: string } }>('/api/statistics/:userId', async (req, reply) => {
    const snapshot = readProgress(req.params.userId);
    if (!snapshot) return reply.code(404).send({ error: 'Ei tallennettua edistymistä' });
    const bundle = loadBundle();
    const byId = new Map(bundle.questions.map((q) => [q.id, q]));

    const perCategory: Record<string, { attempts: number; correct: number; percent: number }> = {};
    for (const cat of bundle.categories) perCategory[cat.id] = { attempts: 0, correct: 0, percent: 0 };

    let totalAttempts = 0;
    let totalCorrect = 0;
    const weak: { questionId: string; percent: number; attempts: number }[] = [];

    for (const [id, stat] of Object.entries(snapshot.questionStats)) {
      const question = byId.get(id);
      const attempts = stat.attempts ?? 0;
      const correct = stat.correct ?? 0;
      totalAttempts += attempts;
      totalCorrect += correct;
      if (question && perCategory[question.category]) {
        perCategory[question.category].attempts += attempts;
        perCategory[question.category].correct += correct;
      }
      if (attempts >= 2 && correct / attempts < 0.6) {
        weak.push({ questionId: id, percent: Math.round((correct / attempts) * 100), attempts });
      }
    }
    for (const c of Object.values(perCategory)) {
      c.percent = c.attempts ? Math.round((c.correct / c.attempts) * 100) : 0;
    }

    const speciesStats = Object.entries(snapshot.speciesStats).map(([id, stat]) => ({
      speciesId: id,
      name: bundle.species.find((s) => s.id === id)?.nameFi ?? id,
      attempts: stat.attempts ?? 0,
      correct: stat.correct ?? 0,
      percent: stat.attempts ? Math.round((stat.correct / stat.attempts) * 100) : 0,
    }));

    return {
      userId: snapshot.userId,
      updatedAt: snapshot.updatedAt,
      overall: {
        attempts: totalAttempts,
        correct: totalCorrect,
        percent: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      },
      perCategory,
      species: speciesStats.sort((a, b) => a.percent - b.percent),
      weakQuestions: weak.sort((a, b) => a.percent - b.percent).slice(0, 20),
      exams: snapshot.exams,
      profile: snapshot.profile,
    };
  });

  // Admin: kysymysten JSON-import (ohje kohta 30).
  app.post<{ Body: { questions?: Question[]; dryRun?: boolean } }>('/api/admin/import', async (req, reply) => {
    const incoming = req.body?.questions;
    if (!Array.isArray(incoming)) return reply.code(400).send({ error: 'Odota { questions: [...] }' });

    const validCategories = new Set(loadBundle().categories.map((c) => c.id));
    const errors: string[] = [];
    const accepted: Question[] = [];

    incoming.forEach((q, index) => {
      const label = q?.id ? `Kysymys ${q.id}` : `Rivi ${index + 1}`;
      if (!q?.id || typeof q.id !== 'string') return errors.push(`${label}: id puuttuu`);
      if (!q.category || !validCategories.has(q.category as string))
        return errors.push(`${label}: tuntematon aihealue '${q.category}'`);
      if (!q.question || typeof q.question !== 'string') return errors.push(`${label}: kysymysteksti puuttuu`);
      if (!Array.isArray(q.answers) || q.answers.length < 2) return errors.push(`${label}: vähintään 2 vastausta`);
      if (!q.answers.some((a) => a?.correct)) return errors.push(`${label}: yhtään oikeaa vastausta ei ole merkitty`);
      accepted.push({
        ...q,
        difficulty: typeof q.difficulty === 'number' ? q.difficulty : 2,
        explanation: q.explanation ?? '',
        source: q.source ?? { title: 'Admin-import', page: null },
        validFrom: q.validFrom ?? new Date().toISOString().slice(0, 10),
        validUntil: q.validUntil ?? null,
        reviewStatus: q.reviewStatus ?? 'draft',
        tags: q.tags ?? ['admin-import'],
      });
    });

    if (req.body?.dryRun) {
      return { dryRun: true, accepted: accepted.length, rejected: errors.length, errors };
    }

    ensureProgressDirs();
    const file = path.join(questionsDir, 'imported.json');
    const existing: Question[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    const map = new Map(existing.map((q) => [q.id, q]));
    for (const q of accepted) map.set(q.id, q);
    fs.writeFileSync(file, JSON.stringify([...map.values()], null, 2) + '\n', 'utf8');

    const bundle = rebuildBundle();
    return {
      imported: accepted.length,
      rejected: errors.length,
      errors,
      totalQuestions: bundle.stats.questions,
      totalCategories: bundle.stats.categories,
    };
  });
}
