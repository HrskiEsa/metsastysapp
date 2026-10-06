/**
 * Etsii ja poistaa lajikuvien duplikaatit:
 *  - puuttuvat tiedostotlevyltä (poistaa tietueen)
 *  - saman lajin sisällä identtiset tiedostot (sha256-tarkiste)
 *  - sama kuvatiedosto eri lajien alla
 *  - samat image_url -rivit lajin sisällä
 *
 * Raportointi: node scripts/dedupe-species-images.mjs
 * Korjaus:     node scripts/dedupe-species-images.mjs --fix   (päivittää myös data/bundle.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const speciesJson = path.join(root, 'data', 'species.json');
const imgDir = path.join(root, 'client', 'public', 'images', 'species');
const fix = process.argv.includes('--fix');

const species = JSON.parse(fs.readFileSync(speciesJson, 'utf8'));
const hashOf = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const issues = [];
const globalByHash = new Map();

for (const s of species) {
  const byHash = new Map(); // hash -> image_url (pidetään ensimmäinen)
  const byUrl = new Set();
  const kept = [];
  for (const img of s.images) {
    const p = path.join(root, 'client', 'public', img.image_url.replace(/^\//, ''));
    if (!fs.existsSync(p)) {
      issues.push(['PUUTTUU', s.id, img.image_url]);
      continue;
    }
    if (byUrl.has(img.image_url)) {
      issues.push(['DUP-URL', s.id, img.image_url]);
      continue;
    }
    const h = hashOf(p);
    if (byHash.has(h)) {
      issues.push(['DUP-SISALTÖ', s.id, img.image_url, '=>', byHash.get(h)]);
      continue;
    }
    const g = globalByHash.get(h);
    if (g && g.species !== s.id) {
      issues.push(['DUP-LAJIENVALILLA', s.id, img.image_url, '=>', g.species, g.image_url]);
      continue;
    }
    if (!g) globalByHash.set(h, { species: s.id, image_url: img.image_url });
    byHash.set(h, img.image_url);
    byUrl.add(img.image_url);
    kept.push(img);
  }
  s.__kept = kept;
}

const total = species.reduce((a, s) => a + s.images.length, 0);
const keptTotal = species.reduce((a, s) => a + s.__kept.length, 0);
console.log(`lajeja: ${species.length} | kuvia: ${total} | pidetään: ${keptTotal}`);
console.log(`ongelmia: ${issues.length}`);
for (const i of issues) console.log(' ', i.join(' | '));

if (fix) {
  let removed = 0;
  for (const s of species) {
    for (const img of s.images) {
      if (!s.__kept.includes(img)) {
        const p = path.join(root, 'client', 'public', img.image_url.replace(/^\//, ''));
        if (fs.existsSync(p)) fs.unlinkSync(p);
        removed++;
      }
    }
    s.images = s.__kept;
    delete s.__kept;
  }
  fs.writeFileSync(speciesJson, JSON.stringify(species, null, 2) + '\n', 'utf8');
  console.log(`--fix: poistettu ${removed} duplikaattia, species.json päivitetty`);

  // Prune: poista kuvakansiosta tiedostot, joita mikään laji ei enää viittaa.
  const referenced = new Set(species.flatMap((s) => s.images.map((i) => path.basename(i.image_url))));
  let pruned = 0;
  for (const f of fs.readdirSync(imgDir)) {
    if (!referenced.has(f)) {
      fs.unlinkSync(path.join(imgDir, f));
      pruned++;
    }
  }
  console.log(`--fix: prunattu ${pruned} orpoa tiedostoa`);

  // Rakenna bundle uudelleen, jotta käyttöliittymän data vastaa levytilaa.
  execSync('node scripts/build-data.mjs', { cwd: root, stdio: 'inherit' });
} else {
  for (const s of species) delete s.__kept;
}
