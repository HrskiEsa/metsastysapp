import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { registerRoutes } from './routes.js';
import { ensureProgressDirs, loadBundle, repoRoot } from './data.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  bodyLimit: 8 * 1024 * 1024,
});

await app.register(cors, { origin: true });

ensureProgressDirs();

app.setErrorHandler((error: unknown, _req, reply) => {
  app.log.error(error);
  const err = error as { statusCode?: number; message?: string };
  const status = err.statusCode ?? 500;
  reply.code(status).send({ error: status === 500 ? 'Palvelinvirhe' : (err.message ?? 'Virhe') });
});

await registerRoutes(app);

// Tuotannossa sama palvelin jakaa myös käyttöliittymän (yksi Docker-kontti, ohje kohta 50).
const clientDist = path.join(repoRoot, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist, prefix: '/' });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) return reply.code(404).send({ error: 'Reittiä ei löytynyt' });
    return reply.sendFile('index.html');
  });
  app.log.info(`Käyttöliittymä tarjoillaan kansiosta ${clientDist}`);
} else {
  app.log.info('client/dist puuttuu – aja `npm run build` tarjoillaksesi käyttöliittymän samasta palvelimesta.');
}

try {
  const bundle = loadBundle();
  app.log.info(
    `Data: ${bundle.stats.questions} kysymystä, ${bundle.stats.species} lajia (kuvia ${bundle.stats.speciesWithImages})`,
  );
} catch (err) {
  app.log.error(String(err));
}

await app.listen({ port: PORT, host: HOST });
app.log.info(`Metsästäjä-akatemia API: http://localhost:${PORT}/api/health`);
