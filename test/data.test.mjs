import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(root, 'data', 'bundle.json');

const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

test('bundle sisältää kategoriat, kysymykset ja lajit', () => {
  assert.ok(bundle.categories.length >= 8, 'vähintään 8 aihealuetta');
  assert.ok(bundle.questions.length > 50, 'kysymyspankissa on sisältöä');
  assert.ok(bundle.species.length >= 40, 'lajeja vähintään 40');
});

test('jokainen kysymys on muodollisesti kelvollinen', () => {
  const categoryIds = new Set(bundle.categories.map((c) => c.id));
  for (const q of bundle.questions) {
    assert.ok(q.id, 'kysymyksellä on id');
    assert.ok(categoryIds.has(q.category), `tuntematon aihealue: ${q.category} (${q.id})`);
    assert.ok(typeof q.question === 'string' && q.question.length > 10, `kysymysteksti puuttuu: ${q.id}`);
    assert.ok(Array.isArray(q.answers) && q.answers.length >= 2, `liian vähän vastauksia: ${q.id}`);
    const correct = q.answers.filter((a) => a.correct).length;
    assert.equal(correct, 1, `täsmälleen yksi oikea vastaus vaaditaan: ${q.id} (nyt ${correct})`);
    const texts = new Set(q.answers.map((a) => a.text));
    assert.equal(texts.size, q.answers.length, `päällekkäisiä vastausvaihtoehtoja: ${q.id}`);
    assert.ok(typeof q.explanation === 'string' && q.explanation.length > 10, `selitys puuttuu: ${q.id}`);
    assert.ok(q.source?.title, `lähde puuttuu: ${q.id}`);
  }
});

test('kysymysten id:t ovat yksilöllisiä', () => {
  const ids = bundle.questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, 'id:t eivät saa toistua');
});

test('jokaisella lajilla on useita kuvia ja tekijänoikeustiedot', () => {
  for (const s of bundle.species) {
    assert.ok(s.images && s.images.length >= 2, `vähintään 2 kuvaa vaaditaan: ${s.id} (${s.images?.length ?? 0})`);
    const urls = new Set();
    for (const img of s.images) {
      assert.ok(img.image_url?.startsWith('/images/species/'), `kuvapolku virheellinen: ${s.id}`);
      assert.ok(img.photographer, `kuvaaja puuttuu: ${s.id}`);
      assert.ok(img.license, `lisenssi puuttuu: ${s.id}`);
      assert.ok(img.source, `lähde puuttuu: ${s.id}`);
      assert.ok(img.attribution, `attribuutio puuttuu: ${s.id}`);
      assert.ok(!urls.has(img.image_url), `kuvien urlit toistuvat: ${s.id}`);
      urls.add(img.image_url);

      const file = path.join(root, 'client', 'public', img.image_url.replace(/^\//, ''));
      assert.ok(fs.existsSync(file), `kuvatiedosto puuttuu levyltä: ${file}`);
    }
  }
});

test('kuvien sisällöt ovat uniikkeja (ei samaa valokuvaa kahdesti)', () => {
  const hashOf = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const globalHashes = new Map(); // hash -> "laji/url"
  for (const s of bundle.species) {
    const local = new Map();
    for (const img of s.images) {
      const file = path.join(root, 'client', 'public', img.image_url.replace(/^\//, ''));
      const hash = hashOf(file);
      assert.ok(!local.has(hash), `lajin ${s.id} sisällä identtinen kuva: ${img.image_url} == ${local.get(hash)}`);
      local.set(hash, img.image_url);
      const owner = globalHashes.get(hash);
      assert.ok(!owner, `sama kuva kahdella lajilla: ${s.id}/${img.image_url} == ${owner}`);
      globalHashes.set(hash, `${s.id}/${img.image_url}`);
    }
  }
});

test('lajintunnistustehtäviin kelpaa vain kuva + nimi', () => {
  for (const s of bundle.species) {
    assert.ok(s.nameFi && s.scientific, `lajin nimet puuttuvat: ${s.id}`);
    assert.ok(['lintu', 'nisakas'].includes(s.type), `tuntematon tyyppi: ${s.id}`);
    assert.ok(s.difficulty >= 1 && s.difficulty <= 5, `vaikeustaso virheellinen: ${s.id}`);
  }
});

test('kokeen jakauma vastaa kokeen rakennetta', () => {
  const { full, quick, distribution, speciesDistribution } = bundle.examConfig;

  const theorySum = Object.entries(distribution)
    .filter(([k]) => !k.startsWith('$'))
    .reduce((sum, [, n]) => sum + n, 0);
  assert.equal(theorySum, full.theoryCount, 'teoriakysymysten jakauman summa täsmää');

  const speciesSum = Object.entries(speciesDistribution)
    .filter(([k]) => !k.startsWith('$'))
    .reduce((sum, [, n]) => sum + n, 0);
  assert.equal(speciesSum, full.speciesCount, 'lajitehtävien jakauman summa täsmää');

  assert.equal(full.theoryCount + full.speciesCount, full.totalQuestions, 'kokonaismäärä täsmää');
  assert.equal(full.totalQuestions, 60, 'virallinen rakenne on 60 kysymystä');
  assert.equal(full.speciesCount, 15, 'lajintuntemustehtäviä on 15');
  assert.equal(full.speciesTimeSeconds, 900, 'lajintuntemusosiolle 15 minuuttia');
  assert.equal(full.totalTimeSeconds, 5400, 'koko kokeelle 90 minuuttia');

  assert.ok(quick.totalQuestions > 0 && quick.totalQuestions < full.totalQuestions, 'pikakoe on lyhyempi');
});

test('jokaiseen kokeen osaan löytyy tarpeeksi kysymyksiä', () => {
  const { distribution, speciesDistribution } = bundle.examConfig;
  for (const [category, needed] of Object.entries(distribution)) {
    if (category.startsWith('$')) continue;
    const available = bundle.questions.filter((q) => q.category === category && !q.validUntil).length;
    assert.ok(available >= needed, `liian vähän kysymyksiä: ${category} (${available} < ${needed})`);
  }
  for (const [type, needed] of Object.entries(speciesDistribution)) {
    if (type.startsWith('$')) continue;
    const available = bundle.species.filter((s) => s.type === type && s.images?.length).length;
    assert.ok(available >= needed, `liian vähän lajeja: ${type} (${available} < ${needed})`);
  }
});

test('kysymysten versiointi on ehjää (validFrom/validUntil)', () => {
  for (const q of bundle.questions) {
    if (q.validUntil) {
      assert.ok(q.validFrom, `arkistoidulla kysymyksellä pitää olla validFrom: ${q.id}`);
      assert.ok(q.validUntil > q.validFrom, `validUntil ennen validFrom: ${q.id}`);
    }
  }
});
