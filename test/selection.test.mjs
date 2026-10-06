import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectionPath = path.join(root, 'server', 'dist', 'services', 'selection.js');

if (!fs.existsSync(selectionPath)) {
  test('kokeen valintalogiikka (vaatii npm run build)', { skip: 'server/dist puuttuu – aja npm run build' }, () => {});
} else {
  const { buildExamPaper } = await import(`file://${selectionPath.replace(/\\/g, '/')}`);
  const bundle = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bundle.json'), 'utf8'));

  test('täysi koe sisältää 45 teoriaa + 15 lajia', () => {
    const paper = buildExamPaper(bundle, bundle.examConfig.full, 12345);
    assert.equal(paper.theory.length, 45);
    assert.equal(paper.species.length, 15);
    assert.equal(paper.theory.length + paper.species.length, 60);
  });

  test('pikakoe on virallista koetta lyhyempi', () => {
    const paper = buildExamPaper(bundle, bundle.examConfig.quick, 999);
    assert.equal(paper.theory.length, bundle.examConfig.quick.theoryCount);
    assert.equal(paper.species.length, bundle.examConfig.quick.speciesCount);
  });

  test('teoriakysymykset noudattavat aihealuejakaumaa', () => {
    const paper = buildExamPaper(bundle, bundle.examConfig.full, 2026);
    const counts = {};
    for (const q of paper.theory) counts[q.category] = (counts[q.category] ?? 0) + 1;
    for (const [category, expected] of Object.entries(bundle.examConfig.distribution)) {
      if (category.startsWith('$')) continue;
      assert.equal(counts[category], expected, `jakauma ei täsmää: ${category}`);
    }
  });

  test('lajitehtävät jakautuvat lintuihin ja nisäkkäisiin', () => {
    const paper = buildExamPaper(bundle, bundle.examConfig.full, 777);
    const counts = {};
    for (const s of paper.species) counts[s.type] = (counts[s.type] ?? 0) + 1;
    for (const [type, expected] of Object.entries(bundle.examConfig.speciesDistribution)) {
      if (type.startsWith('$')) continue;
      assert.equal(counts[type], expected, `lajijakauma ei täsmää: ${type}`);
    }
  });

  test('paperi on sama samalla siemenluvulla (toistettavuus)', () => {
    const a = buildExamPaper(bundle, bundle.examConfig.full, 42);
    const b = buildExamPaper(bundle, bundle.examConfig.full, 42);
    assert.deepEqual(
      a.theory.map((q) => q.id),
      b.theory.map((q) => q.id),
    );
    assert.deepEqual(
      a.species.map((s) => s.id),
      b.species.map((s) => s.id),
    );
  });

  test('paperi ei sisällä toistoja eikä paljasta oikeita vastauksia', () => {
    const paper = buildExamPaper(bundle, bundle.examConfig.full, 31337);
    assert.equal(new Set(paper.theory.map((q) => q.id)).size, paper.theory.length, 'kysymykset eivät toistu');
    assert.equal(new Set(paper.species.map((s) => s.id)).size, paper.species.length, 'lajit eivät toistu');
    assert.ok(!JSON.stringify(paper).includes('"correct"'), 'oikeat vastaukset eivät vuoda paperiin');
    for (const t of paper.theory) {
      assert.equal(t.answers.length, 4, `vastausvaihtoehtoja pitää olla 4: ${t.id}`);
      assert.ok(!('correct' in t.answers[0]));
    }
  });

  test('lajintuntemustehtävillä on aina kuva', () => {
    const paper = buildExamPaper(bundle, bundle.examConfig.full, 555);
    for (const s of paper.species) {
      assert.ok(s.image_url?.startsWith('/images/species/'), `kuva puuttuu paperista: ${s.id}`);
      assert.ok(s.attribution, `attribuutio puuttuu: ${s.id}`);
    }
  });

  test('kuvan arvonta vaihtelee eri siemenluvuilla', () => {
    const seeds = [11, 22, 33, 44, 55, 66, 77, 88];
    const multiImage = bundle.species.filter((s) => s.images.length > 1);
    assert.ok(multiImage.length > 0, 'lajeilla pitää olla useita kuvia');

    // Kaikilla siemenillä sama lajijoukko, mutta kuvavalinta vaihtelee ainakin joillakin lajeilla.
    const imageVariants = new Map();
    for (const seed of seeds) {
      const paper = buildExamPaper(bundle, bundle.examConfig.full, seed);
      for (const s of paper.species) {
        const arr = imageVariants.get(s.id) ?? new Set();
        arr.add(s.image_url);
        imageVariants.set(s.id, arr);
      }
    }
    const variable = [...imageVariants.values()].filter((set) => set.size > 1).length;
    assert.ok(variable > 0, 'saman lajin kuva vaihtelee kokeittain, kun kuvia on useita');
  });

  test('eri siemenluvut tuottavat eri paperin', () => {
    const a = buildExamPaper(bundle, bundle.examConfig.full, 1);
    const b = buildExamPaper(bundle, bundle.examConfig.full, 2);
    assert.notDeepEqual(
      a.theory.map((q) => q.id),
      b.theory.map((q) => q.id),
    );
  });
}
