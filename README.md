# Metsästäjä-akatemia

Metsästäjätutkintoon valmentautumiseen tarkoitettu fullstack-sovellus. Se toimii selvaimessa ja
puhelimessa (asennettavana PWA:na) ja **myös täysin offline-tilassa**.

> **Tämä ei ole virallinen tutkinto.** Sovellus on harjoitteluväline eikä anna tutkintosuoritusta.
> Harjoittele aina ajantasaisen **Metsästäjän oppaan** ja Riistakeskuksen ohjeiden mukaan.

---

## Mitä sovellus sisältää

| Ominaisuus | Tila |
| --- | --- |
| Etusivu: kokonaisosaaminen, aihealueet, suositus, päivän harjoitus | ✅ |
| 8 virallista aihealuetta | ✅ |
| 176 teoriakysymystä selityksineen ja lähdeviitteineen (monet pohjautuvat suoraan riista.fin sisältöön) | ✅ |
| 72 riistalajia ja 214 tunnistuskuvaa (n. 3/laji, Wikimedia Commons + lisenssit) | ✅ |
| Kuvan arvonta harjoituksissa ja kokeissa lajin koko kuvavalikoimasta | ✅ |
| Lajitietolaatikon kuvagalleria (pikkukuvat + attribuutiot) | ✅ |
| Virallisen tutkinnon säännöt: 60 kys., 15 lajia, läpi enintään 8 väärää (riista.fi) | ✅ |
| Harjoittelumuodot: kaikki, aihealueittain, heikoimmat, väärin vastatut, vaikeat, kerrattavat | ✅ |
| Harjoituskoe: pikakoe (15) ja täysi koe (60 = 45 teoriaa + 15 lajia) | ✅ |
| Lajintuntemusosio omalla 15 min aikarajalla, koko koe 90 min | ✅ |
| Aikaraja aikaleimoihin perustuen (ei hajoa välilehden vaihdossa) | ✅ |
| Kysymysten merkitseminen tarkistettavaksi, kysymysluettelo | ✅ |
| Tulossivu + virheiden läpikäynti selityksineen | ✅ |
| Tilastot: kokonaisuus, aihealueet, lajit, viikkoaktiivisuus, historia | ✅ |
| Spaced repetition (10 min → 1 → 3 → 7 → 14 → 30 pv) | ✅ |
| Pelillistäminen: XP, taso, harjoitusputki, saavutukset | ✅ |
| Guest-tila localStorageen + synkronointi palvelimelle | ✅ |
| PWA: asennettava, offline-toiminto, service worker | ✅ |
| Tumma/vaalea/järjestelmän teema, saavutettavuus, läpinäkyvä design | ✅ |
| REST API + admin JSON-import + tilastorajapinnat | ✅ |
| Backend-tietokanta (PostgreSQL), käyttäjätilit, AI/RAG | 🔜 roadmap |

---

## Arkkitehtuuri

```
metsastysapp/
├── data/                     # Sisältö (sama data palvelimelle ja selaimelle)
│   ├── categories.json       # 8 aihealuetta + kokeen kysymysmäärät
│   ├── exam-config.json      # Kokeen rakenne ja jakaumat (konfiguroitava)
│   ├── questions/*.json      # Kysymyspankki aihealueittain
│   ├── species.seed.json     # Lajien perustiedot
│   ├── species.json          # Lajit + kuvat + lisenssitiedot (generoitu)
│   └── bundle.json           # Yhdistetty paketti (generoitu)
├── scripts/
│   ├── fetch-species-images.mjs   # Hakee kuvat ja lisenssit Wikimedia Commonsista
│   ├── build-data.mjs             # Kokoaa data/bundle.json
│   └── generate-icons.mjs         # Piirtää PWA-kuvakkeet (ei riippuvuuksia)
├── server/                   # Node.js + Fastify + TypeScript (REST API)
│   └── src/
│       ├── index.ts          # Käynnistys, CORS, staattinen käyttöliittymä
│       ├── routes.ts         # /api/* -reitit
│       ├── data.ts           # Datan lataus ja uudelleenrakennus
│       ├── progressStore.ts  # Edistymisen tallennus (tiedostopohjainen MVP)
│       └── services/selection.ts  # Kokeen kysymysvalinta
└── client/                   # React + TypeScript + Vite + Tailwind + PWA
    ├── public/images/species/     # Lajikuvat (offline-käyttöön)
    ├── public/icons/              # PWA-kuvakkeet
    └── src/
        ├── components/       # QuestionCard, AnswerButton, SpeciesCard, Timer, …
        ├── pages/            # Home, Practice, Species, Exam, Results, Statistics, …
        ├── services/         # questionEngine, examEngine, spacedRepetition, statistics
        ├── hooks/            # useProgress (tila + synkronointi), useTheme
        └── lib/              # storage (localStorage), api (offline-tolerantti client)
```

**Miksi sovellus toimii offline:** sisältö on mukana buildissa (`data/bundle.json` ja
`client/public/images/`), joten kysymykset, selitykset ja kuvat eivät vaadi verkkoyhteyttä.
Palvelin tarjoaa tuoreimman sisällön ja edistymisen synkronoinnin, mutta mikään ei hajoa ilman sitä.
Tämä on tarkoituksellinen valinta opiskelusovellukselle (ks. ohje kohdat 21 ja 23).

---

## Pika-aloitus

Vaatimukset: **Node.js 20+** ja npm.

```bash
npm install          # asentaa riippuvuudet ja rakentaa data/bundle.json

# 1) Kuvien haku (vain ensimmäisellä kerralla, vaatii verkkoyhteyden)
npm run images       # 46 lajikuvaa + lisenssitiedot Wikimedia Commonsista

# 2) Kehityspalvelimet (API :3001 ja käyttöliittymä :5173)
npm run dev
```

Avaa <http://localhost:5173>. Vite välittää `/api`-pyynnöt automaattisesti palvelimelle.

### Tuotantobuild ja yksi palvelin

```bash
npm run build        # data + client/dist + server/dist
npm start            # Fastify tarjoilee sekä API:n että käyttöliittymän :3001
```

### Docker

```bash
docker compose up --build     # http://localhost:3001
```

### Julkaisu Coolifyyn

Sovellus on paketoitu Coolify-yhteensopivaksi (yksi kontti, healthcheck `/api/health`, pysyvä tila volumessa).
Katso vaiheittainen ohje: **[COOLIFY.md](COOLIFY.md)** — kolme tapaa (Dockerfile, Docker Compose tai valmis image rekisteristä) sekä ympäristömuuttujat tiedostossa [.env.example](.env.example).

---

## Skriptit

| Komento | Kuvaus |
| --- | --- |
| `npm run data` | Kokoaa `data/bundle.json` kysymyksistä, kategorioista ja lajeista |
| `npm run images` | Hakee lajikuvat ja lisenssitiedot, kirjoittaa `data/species.json` |
| `npm run dev` | Palvelin + käyttöliittymä kehitysmoodissa |
| `npm run build` | Tuotantobuild |
| `npm start` | Tuotantopalvelin |
| `npm run typecheck` | TypeScript-tarkistus molemmille workspacelle |
| `npm run icons -w client` | Piirtää PWA-kuvakkeet uudelleen |

---

## API

| Metodi | Reitti | Kuvaus |
| --- | --- | --- |
| GET | `/api/health` | Terveystarkistus |
| GET | `/api/bundle` | Koko sisältöpaketti |
| GET | `/api/meta` | Versio ja datan tilastot |
| GET | `/api/categories` | 8 aihealuetta |
| GET | `/api/exam-config` | Kokeen rakenne ja jakaumat |
| GET | `/api/questions?category=&difficulty=&q=&limit=` | Kysymykset suodatettuna |
| GET | `/api/questions/:id` | Yksittäinen kysymys |
| GET | `/api/species?type=&huntable=&q=` | Lajit suodatettuna |
| GET | `/api/species/:id` | Laji kuvineen ja lisensseineen |
| GET | `/api/images/attribution` | Kaikkien kuvien tekijänoikeustiedot |
| POST | `/api/exams/paper` | Generoi koepaperin jakauman mukaan (`{mode, seed}`) |
| GET/PUT | `/api/progress/:userId` | Edistymisen haku ja yhdistävä tallennus |
| GET | `/api/statistics/:userId` | Kooste: osaaminen, heikot kysymykset, historia |
| POST | `/api/admin/import` | Kysymysten JSON-import (`dryRun` tuella) |

Esimerkki koepaperin generoinnista:

```bash
curl -X POST http://localhost:3001/api/exams/paper \
  -H 'content-type: application/json' \
  -d '{"mode":"full","seed":42}'
# → 45 teoriakysymystä jakauman mukaan + 15 lajintunnistusta (9 lintua, 6 nisäkästä)
```

---

## Sisällön lisääminen

### Kysymykset

Lisää kysymys `data/questions/<aihealue>.json` -tiedostoon ja aja `npm run data`:

```json
{
  "id": "turvallisuus-100",
  "category": "turvallisuus",
  "difficulty": 2,
  "question": "Kysymysteksti?",
  "answers": [
    { "text": "Vaihtoehto A", "correct": false },
    { "text": "Vaihtoehto B", "correct": true }
  ],
  "explanation": "Perustelu, joka näytetään vastaamisen jälkeen.",
  "source": { "title": "Metsästäjän opas", "edition": "24. painos (2026)", "page": 123 },
  "validFrom": "2026-01-01",
  "validUntil": null,
  "reviewStatus": "draft",
  "tags": ["turvallisuus"]
}
```

Rakenne tukee vapaasti 2–5 vaihtoehtoa, useampaa oikeaa vastausta ja kuvakysymyksiä.
`validFrom` / `validUntil` mahdollistavat **sisällön versioinnin**: kun laki muuttuu, vanha kysymys
arkistoidaan asettamalla `validUntil`, eikä sitä tarvitse poistaa.

Tarkista ennen julkaisua, että jokaisella kysymyksellä on täsmälleen yksi oikea vastaus ja selitys.
`npm run data` tulostaa varoitukset, jos kuvia puuttuu.

### Admin-import (JSON)

```bash
curl -X POST http://localhost:3001/api/admin/import \
  -H 'content-type: application/json' \
  -d '{"questions":[ ... ]}'
```

Palvelin validoi jokaisen kysymyksen (id, aihealue, tekstit, oikea vastaus) ja palauttaa
`{ accepted, rejected, errors }`. Hyväksytyt kirjoitetaan `data/questions/imported.json` -tiedostoon
ja `data/bundle.json` rakennetaan automaattisesti uudelleen. Käytä `"dryRun": true` -valintaa
esitarkistukseen.

Uudet kysymykset kannattaa merkitä `"reviewStatus": "draft"`, kunnes ihminen on tarkistanut ne
(ks. ohje kohdat 33 ja 36).

---

## Sisällön lähteet

- **Kokeen rakenne ja säännöt:** Suomen riistakeskus, riista.fi (Metsästäjätutkinto): 60 kysymystä, joista 15 lajintuntemustehtävää tehdään ensin (enintään 15 min); koko koe enintään 1,5 h; suoritus hyväksytään, kun vääriä vastauksia on enintään 8 (vähintään 52/60); maksu 20 €; vastauskielet fi/sv/smn/en; riistanhoitomaksun maksamatta jättäminen viitenä peräkkäisenä vuonna vanhentaa tutkinnon.
- **Lajisto:** Riistakeskuksen riistalajiluettelot – riistanisäkkäät, riistalinnut, rauhoittamattomat linnut ja haitalliset vieraslajit. Sovelluksen lajitiedot (tuntomerkit, asema, elinympäristö) on koostettu näiden esittelyjen pohjalta.
- **Metsästysajat ja -muodot:** Riistakeskuksen metsästys- ja pyyntiajat sekä metsästysmuotojen ohjeet (kanalinnustus, vesilinnustus, ajoketjumetsästyksen turvallisuus, hämärämetsästyksen rajat, kiintiöt).
- **Kysymykset:** Lähdeviitteenä joko Metsästäjän opas tai riista.fi-sivu. Sisältö on tarkistettava ajantasaisesta oppaasta ennen virallista käyttöä.

## Kuvien tekijänoikeudet

Kuvat haetaan Wikimedia Commonsista ja ne ovat vapaasti lisensoituja (CC BY, CC BY-SA, CC0 tai
public domain). **Jokaisesta kuvasta tallennetaan:**

- `photographer` – kuvaaja
- `license` ja `license_url` – lisenssi ja linkki lisenssitekstiin
- `source` ja `source_url` – lähde ja tiedoston sivu
- `attribution` – valmis mainintarivi

Tiedot näkyvät sovelluksessa kuvan yhteydessä ja ne saa koneellisesti osoitteesta
`GET /api/images/attribution`. Kuvat ladataan paikallisesti kansioon
`client/public/images/species/`, jotta sovellus toimii offline-tilassa.

Jokaiselle lajille tavoitellaan **n. 3 tunnistuskuvaa** (eri kuvauskulmia ja -oloja:
ukko/kana, kesä-/talvipuku, sivuprofiili/lento). Ensikuva on Wikipedian artikkelin pääkuva ja
lisäkuvat haetaan Commons-haulla tieteellisellä nimellä. Kartat, piirrokset, kallothinnat ja
jälkikuvat suodatetaan pois (`BAD_FILE`-suodatin skriptissä). Harjoituksissa ja kokeissa kuva
arvotaan lajin kaikista kuvista, jolloin tunnistamista joutuu soveltamaan eri kuva-asentojen
kautta – kuten virallisessa tutkinnossakin.

Skripti **ei kopioi** minkään kaupallisen sovelluksen tai oppaan kuvia – se hakee vain
Wikimedia Commonsin vapaasti lisensoitua materiaalia. Aja `npm run images` uudelleen
turvallisesti: jo ladatut kuvat säilytetään.

---

## Tietosuoja (GDPR)

- Vierastilassa **mitään ei lähetetä palvelimelle** ilman erillistä synkronointia.
- Tallennettavat tiedot: nimi (vapaaehtoinen), vastaushistoria, kokeiden tulokset, XP ja putki.
- Palvelimella edistyminen tallennetaan tiedostoon `server/.data/progress-<userId>.json`.
- Käyttäjä voi viedä kaiken datansa JSONina, tuoda sen takaisin ja nollata sen Asetuksista.
- MVP kerää mahdollisimman vähän tietoja (ks. ohje kohta 39). Tuotantoon siirryttäessä
  tiedostopohjainen tallennus korvataan PostgreSQL:llä rajapintaa muuttamatta.

---

## Saavutettavuus ja käytettävyys

- Mobile-first: isot kosketuskohteet (vähintään 48 px), alapalkin navigaatio.
- Oikein/väärin ei perustu pelkkään väriin – mukana on aina kuvake ja teksti.
- Kuvilla on alt-tekstit, tilatiedot käyttävät `aria-live`-alueita, tarkennus näkyy selkeästi.
- Tumma teema, `prefers-reduced-motion` -tuki ja safe-area-tuet (iPhone-notch).
- Näppäimistökäyttö on mahdollista kaikkialla.

---

## Roadmap

- **V1 (tämä versio):** etusivu, 8 aihealuetta, teoria, lajintunnistus, harjoituskoe, pisteytys,
  tulossivu, localStorage, PWA.
- **V2:** käyttäjätilit, PostgreSQL, pilvisynkronointi, päivittäinen harjoitus, saavutukset.
- **V3:** admin-paneeli, JSON-import käyttöliittymässä, kuvien hallinta, kysymysten laadunvalvonta,
  lähdeviitteet ja sisällön versiointi.
- **V4:** AI-opettaja, selitykset hyväksytyn lähdemateriaalin pohjalta (RAG), kysymysten generointi
  ihmisen tarkistettavaksi ja henkilökohtainen harjoittelusuositus.

---

## Kehittäjän muistiinpanot

- **Aikaraja:** kokeen kello perustuu aina aikaleimaan (`endAt - Date.now()`), ei laskuriin.
  Siksi selaimen jäädytys tai välilehden vaihto ei riko aikaa.
- **Spaced repetition:** väärä vastaus palauttaa aikataulun alkuun (10 min), oikeat vastaukset
  etenevät 1 → 3 → 7 → 14 → 30 päivää.
- **Kokeen jakauma** on konfiguroitavissa tiedostossa `data/exam-config.json` – ei kovakoodattu
  käyttöliittymään, koska viralliset vaatimukset voivat muuttua.
- Data luetaan sekä palvelimella että selaimessa **samasta** JSON-lähteestä, joten sisältöä ei
  tarvitse ylläpitää kahdessa paikassa.
