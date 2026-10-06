/**
 * Hakee jokaiselle lajille USEITA tunnistuskuvia Wikimedia Commonsista.
 *
 * Laatuvaatimukset (oppitarkoitus vaatii, ettei kuva saa olla väärästä lajista):
 *  1. Ensikuva: Wikipedian artikkelin pääkuva (laadukkain ja varmin osuma).
 *  2. Lisäkuvat: Commons-haku + KUVAN METATIETOJEN varmistus, että kuvan
 *     luokittelussa esiintyy lajin tieteellinen nimi (CommonsWithCategories).
 *     Pelkkä hakusanan osuma tiedostonimessä ei riitä (esim. ruotsin "grus").
 *  3. Duplikaatit estetään tiedostonimen normalisoinnilla; indeksillä
 *     varmistetaan ettei sama tiedosto liitetä kahteen lajiin.
 *
 * Käyttö:  node scripts/fetch-species-images.mjs
 * Lopputulos: client/public/images/species/*.jpg  ja  data/species.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(root, 'data', 'species.seed.json');
const outJson = path.join(root, 'data', 'species.json');
const imgDir = path.join(root, 'client', 'public', 'images', 'species');

const USER_AGENT = 'MetsastajaAkatemia/1.0 (educational hunting-exam trainer; node-fetch; contact: metsastaja-akatemia@example.invalid)';
const TARGET_IMAGES = 3;
const API_GAP_MS = 1100;
const DOWNLOAD_GAP_MS = 250;

fs.mkdirSync(imgDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastApi = 0;
let lastDownload = 0;

async function politeFetch(url, extraHeaders = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...extraHeaders } });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const backoff = Math.max(retryAfter * 1000, 5000 * (attempt + 1));
      console.warn(`  … ${res.status}, odotetaan ${Math.round(backoff / 1000)} s`);
      await sleep(backoff);
      continue;
    }
    return res;
  }
  throw new Error('rate limited toistuvasti');
}

async function api(base, params) {
  const wait = Math.max(0, API_GAP_MS - (Date.now() - lastApi));
  if (wait) await sleep(wait);
  lastApi = Date.now();
  const url = new URL(base);
  url.search = new URLSearchParams({ format: 'json', ...params }).toString();
  const res = await politeFetch(url, { Accept: 'application/json' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const clean = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normName = (n) => String(n ?? '').toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u0370-\u03FF\u0590-\u05FF\u0400-\u04FF]/g, '');

const BAD_FILE = /kartta|map|distribution|levinneisyys|skull|kallo|track|jälki|jäljet|egg|muna|munat|skeleton|luuranko|diagram|icon|logo|stamp|postimerkki|coat[ _-]of[ _-]arms|vaakuna|illustration|drawing|piirros|sign|airshow|lentonyytt|aircraft|plane/i;

/** Sisältötarkiste: estää saman valokuvan kahdella eri tiedostonimellä. */
function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function metaFromImageinfo(ii) {
  const meta = ii?.extmetadata ?? {};
  const photographer = clean(meta.Artist?.value) || 'Tuntematon';
  const license = clean(meta.LicenseShortName?.value) || clean(meta.UsageTerms?.value) || 'Katso lähdesivu';
  return {
    photographer,
    license,
    license_url: meta.LicenseUrl?.value ?? null,
    source_url: ii?.descriptionurl ?? null,
    attribution: `${photographer} / ${license}`,
  };
}

/** Varmistaa, että kuvan luokittelussa esiintyy lajin tieteellinen nimi. */
async function categoriesVerify(fileName, species) {
  const data = await api('https://commons.wikimedia.org/w/api.php', {
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'categories',
    cllimit: 'max',
    clshow: '!hidden',
  });
  const page = Object.values(data?.query?.pages ?? {})[0];
  const cats = (page?.categories ?? []).map((c) => normName(c.title));
  const genus = normName(String(species.scientific ?? '').split(' ')[0]);
  const binomial = normName(species.scientific);
  const commonName = normName(species.nameEn);

  // Osuma: binomi (esim. "grusgrus"), pelkkä suvun nimi (esim. "grus") tai englanninkielinen nimi.
  return cats.some(
    (c) => (binomial && c.includes(binomial)) || (genus && genus.length >= 5 && c.includes(genus)) || (commonName && commonName.length >= 5 && c.includes(commonName)),
  );
}

/** Ensikuva: Wikipedian artikkelin pääkuva. */
async function findPrimary(title) {
  const data = await api('https://fi.wikipedia.org/w/api.php', {
    action: 'query',
    titles: title,
    prop: 'pageimages',
    piprop: 'original|name',
    redirects: '1',
  });
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return null;
  return page.pageimage ?? null;
}

async function searchCommonsImages(query, limit = 12) {
  const data = await api('https://commons.wikimedia.org/w/api.php', {
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: query,
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1000',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|UsageTerms',
  });
  const pages = Object.values(data?.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const candidates = [];
  for (const page of pages) {
    const ii = page.imageinfo?.[0];
    const title = page.title ?? '';
    if (!ii || !/^File:/i.test(title)) continue;
    if (!/\.(jpe?g|png)$/i.test(title)) continue;
    if (BAD_FILE.test(title)) continue;
    candidates.push({
      file_name: title.replace(/^File:/i, ''),
      url: ii.thumburl ?? ii.url,
      ...metaFromImageinfo(ii),
    });
  }
  return candidates;
}

async function download(url, destPath, knownHashes) {
  const wait = Math.max(0, DOWNLOAD_GAP_MS - (Date.now() - lastDownload));
  if (wait) await sleep(wait);
  lastDownload = Date.now();
  const res = await politeFetch(url, { Accept: 'image/jpeg,image/png,*/*' });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error('file too small');
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (knownHashes?.has(hash)) {
    const err = new Error('DUP-SISÄLTÖ: sama valokuva on jo ladattu');
    err.code = 'EDUP';
    throw err;
  }
  fs.writeFileSync(destPath, buf);
  knownHashes?.add(hash);
  return buf.length;
}

function localPathFor(speciesId, index, fileName) {
  const ext = /\.png$/i.test(fileName) ? 'png' : 'jpg';
  const base = index === 0 ? speciesId : `${speciesId}-${index}`;
  return { localPath: path.join(imgDir, `${base}.${ext}`), imageUrl: `/images/species/${base}.${ext}` };
}

/** Seuraava vapaa URL-indeksi: ei ylikirjoita aiempia tiedostoja. */
function nextSlot(speciesId, images) {
  const used = new Set(images.map((i) => i.image_url));
  let n = 1;
  while (used.has(`/images/species/${speciesId}-${n}.jpg`) || used.has(`/images/species/${speciesId}-${n}.png`)) n++;
  // 0 on varattu ensikuvalle (speciesId.jpg), joten ensimmäinen lisäkuva on -1.
  return n;
}

/** Rakentaa muiden lajien nimistä indeksin väärin liitettyjen kuvien estämiseksi. */
function buildOtherNameIndex(seedList) {
  return seedList.map((s) => ({
    id: s.id,
    binomial: normName(s.scientific),
  }));
}

function mentionsOtherSpecies(fileName, species, index) {
  const n = normName(fileName);
  const self = normName(species.scientific);
  for (const other of index) {
    if (other.id === species.id || !other.binomial) continue;
    // Jos tiedostonimessä on toisen lajin binomi eikä se ole tämän lajin alalajin osa → hylkää.
    if (n.includes(other.binomial) && !(self.includes(other.binomial) || other.binomial.includes(self.split(' ')[0]))) {
      return other.id;
    }
  }
  return null;
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const previous = fs.existsSync(outJson) ? JSON.parse(fs.readFileSync(outJson, 'utf8')) : [];
  const prevById = new Map(previous.map((s) => [s.id, s]));
  const otherIndex = buildOtherNameIndex(seed);

  // Sisältöhashit kaikista levyllä jo olevista kuvista: estää saman valokuvan
  // tallentumisen toiselle lajille tai samalle lajille toisella nimellä
  // (teeri-1/teeri-2 -bugin juurisyy).
  const seedHashes = new Set();
  for (const s of previous) {
    for (const img of s.images ?? []) {
      const p = path.join(imgDir, path.basename(img.image_url));
      if (fs.existsSync(p)) seedHashes.add(hashFile(p));
    }
  }

  const out = [];
  let downloaded = 0;
  let rejected = 0;

  for (const species of seed) {
    const prev = prevById.get(species.id);
    let images = (prev?.images ?? []).filter((img) =>
      fs.existsSync(path.join(imgDir, path.basename(img.image_url))),
    );

    // Puhdista aiemmin ladatut lisäkuvat: jos tiedostonimi ei viittaa tähän lajiin
    // eikä kuvaa ole varmistettu luokittelulla, se hylätään ja haetaan tilalle.
    const primary = images[0];
    const extras = images.slice(1).filter((img) => {
      const n = normName(img.file_name);
      const bin = normName(species.scientific);
      const genus = normName(String(species.scientific ?? '').split(' ')[0]);
      const ok = n.includes(bin) || (genus.length >= 5 && n.includes(genus)) || n.includes(normName(species.nameEn));
      if (!ok) rejected++;
      return ok;
    });
    images = primary ? [primary, ...extras] : extras;

    const knownFiles = new Set(images.map((img) => normName(img.file_name)));

    // 1) Ensikuva Wikipedia-artikkelista, jos ei yhtään kuvaa.
    if (images.length === 0) {
      const titleCandidates = [species.wikiTitle, species.nameFi, species.scientific].filter(Boolean);
      for (const title of titleCandidates) {
        try {
          const primaryFile = await findPrimary(title);
          if (primaryFile && !BAD_FILE.test(primaryFile)) {
            const { localPath, imageUrl } = localPathFor(species.id, 0, primaryFile);
            const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(primaryFile)}?width=1000`;
            await download(url, localPath, seedHashes);
            const data = await api('https://commons.wikimedia.org/w/api.php', {
              action: 'query',
              titles: `File:${primaryFile}`,
              prop: 'imageinfo',
              iiprop: 'extmetadata|url',
              iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|UsageTerms',
            });
            const page = Object.values(data?.query?.pages ?? {})[0];
            const meta = metaFromImageinfo(page?.imageinfo?.[0]);
            meta.source_url = meta.source_url ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(primaryFile)}`;
            images.push({
              image_url: imageUrl,
              thumbnail_url: imageUrl,
              file_name: primaryFile,
              ...meta,
              source: 'Wikimedia Commons',
            });
            knownFiles.add(normName(primaryFile));
            downloaded++;
            break;
          }
        } catch (err) {
          console.warn(`  ensikuva epäonnistui (${title}): ${err.message}`);
        }
      }
    }

    // 2) Lisäkuvat Commons-haulla + luokitteluvarmistus.
    if (images.length < TARGET_IMAGES) {
      const binomial = species.scientific ?? '';
      const queries = [`"${binomial}" filetype:bitmap`, binomial].filter(Boolean);

      let candidates = [];
      for (const q of queries) {
        if (candidates.length >= TARGET_IMAGES - images.length + 4) break;
        try {
          const found = await searchCommonsImages(q);
          candidates = candidates.concat(found);
        } catch (err) {
          console.warn(`  haku epäonnistui (${q}): ${err.message}`);
        }
      }

      for (const cand of candidates) {
        if (images.length >= TARGET_IMAGES) break;
        if (knownFiles.has(normName(cand.file_name))) continue;
        const other = mentionsOtherSpecies(cand.file_name, species, otherIndex);
        if (other) {
          rejected++;
          continue;
        }
        // Varmistus: lajin tieteellinen nimi kuvan luokittelussa. Tämä estää
        // harhaosumat (esim. ruotsin "grus" kurjelle tuomassa jäniskuvia).
        let verified = false;
        try {
          verified = await categoriesVerify(cand.file_name, species);
        } catch (err) {
          console.warn(`  luokittelutarkistus epäonnistui (${cand.file_name}): ${err.message}`);
        }
        if (!verified) {
          rejected++;
          continue;
        }
        try {
          const slot = nextSlot(species.id, images);
          const { localPath, imageUrl } = localPathFor(species.id, slot, cand.file_name);
          await download(cand.url, localPath, seedHashes);
          // Varmista ettei sama URL ole jo listalla (nimiauto ei saa luoda duplikaattia).
          if (images.some((i) => i.image_url === imageUrl)) {
            fs.unlinkSync(localPath);
            continue;
          }
          images.push({
            image_url: imageUrl,
            thumbnail_url: imageUrl,
            file_name: cand.file_name,
            photographer: cand.photographer,
            license: cand.license,
            license_url: cand.license_url,
            source: 'Wikimedia Commons',
            source_url: cand.source_url,
            attribution: cand.attribution,
          });
          knownFiles.add(normName(cand.file_name));
          downloaded++;
        } catch (err) {
          console.warn(`  lataus epäonnistui (${cand.file_name}): ${err.message}`);
        }
      }
    }

    out.push({ ...species, images });
    fs.writeFileSync(outJson, JSON.stringify(out, null, 2) + '\n', 'utf8');

    const names = images.map((i) => i.license).join(' | ');
    console.log(`${images.length >= TARGET_IMAGES ? '✓' : '~'} ${species.nameFi.padEnd(20)} ${images.length} kuvaa  [${names}]`);
  }

  fs.writeFileSync(outJson, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const withAll = out.filter((s) => s.images.length >= TARGET_IMAGES).length;
  const totalImages = out.reduce((sum, s) => sum + s.images.length, 0);
  console.log(`\nTallennettu ${outJson}`);
  console.log(`Lajeja: ${out.length} | kuvia: ${totalImages} (ladatut: ${downloaded}, hylätyt: ${rejected})`);
  console.log(`Lajeja täydellä listalla: ${withAll}/${out.length}`);
  const sparse = out.filter((s) => s.images.length < TARGET_IMAGES);
  if (sparse.length) console.log('Vähiten kuvia:', sparse.map((s) => `${s.id}(${s.images.length})`).join(', '));
}

main();
