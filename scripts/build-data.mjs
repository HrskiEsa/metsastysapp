/**
 * Kokoaa data/-kansion JSON-tiedostot yhdeksi nipuksi, jonka selain lataa mukaansa.
 *
 * Näin sovellus toimii myös offline-tilassa ilman palvelinta (ohje kohdat 21 ja 23),
 * mutta palvelin lukee samat tiedostot ja tarjoaa ne API:n kautta.
 *
 * Käyttö: node scripts/build-data.mjs
 * Lopputulos: data/bundle.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const read = (p) => JSON.parse(fs.readFileSync(path.join(dataDir, p), 'utf8'));

const categories = read('categories.json').sort((a, b) => a.order - b.order);
const examConfig = read('exam-config.json');

const questionsDir = path.join(dataDir, 'questions');
const questions = fs
  .readdirSync(questionsDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8')));

// Vie kategoriat järjestykseen, jotta käyttöliittymän järjestys on vakaa.
const order = new Map(categories.map((c, i) => [c.id, i]));
questions.sort((a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99) || a.id.localeCompare(b.id));

const speciesSource = fs.existsSync(path.join(dataDir, 'species.json')) ? 'species.json' : 'species.seed.json';
const species = read(speciesSource);

const bundle = {
  generatedAt: new Date().toISOString(),
  version: 1,
  categories,
  examConfig,
  questions,
  species,
  stats: {
    categories: categories.length,
    questions: questions.length,
    species: species.length,
    speciesWithImages: species.filter((s) => (s.images ?? []).length > 0).length,
    speciesImageSource: speciesSource,
  },
};

fs.writeFileSync(path.join(dataDir, 'bundle.json'), JSON.stringify(bundle, null, 2) + '\n', 'utf8');

const byCategory = questions.reduce((acc, q) => ((acc[q.category] = (acc[q.category] ?? 0) + 1), acc), {});
console.log('data/bundle.json kirjoitettu');
console.log(`  aihealueet: ${bundle.stats.categories}`);
console.log(`  kysymykset: ${bundle.stats.questions}` + Object.entries(byCategory).map(([k, v]) => `\n    ${k}: ${v}`).join(''));
console.log(`  lajit: ${bundle.stats.species} (kuvia ${bundle.stats.speciesWithImages}, lähde ${speciesSource})`);

// Varoita, jos kuvat puuttuvat – sovellus toimii silti, mutta lajintunnistus on tyhjä.
if (bundle.stats.speciesWithImages === 0) {
  console.warn('\n⚠️  Yhdelläkään lajilla ei ole kuvaa. Aja: npm run images');
}
