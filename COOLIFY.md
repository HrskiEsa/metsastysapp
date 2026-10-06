# Deploy-ohje: Metsästäjä-akatemia Coolifyyn

Sovellus on yksi kontti, joka tarjoilee sekä REST-API:n (malli `/api/...`) että
prod-käännetyllä käyttöliittymällä (React/PWA). Ei tietokantaa, ei taustapalveluita —
ainoa tila on JSON-tiedostoja `DATA_DIR`-kansiossa, joka kytketään pysyvään volumeen.

**Health check -päätepiste:** `GET /api/health` → `{"status":"ok"}`
**Kuuntelu:** `0.0.0.0:$PORT` (oletus 3001)

---

## Tapa 1: Dockerfile (suositeltu)

1. Työnnä tämä repo Git-palveluun (GitHub/GitLab/Gitea).
2. Coolify → **New Resource** → **Docker Based** → *Dockerfile* → valitse repo ja haara.
3. Coolify tunnistaa `Dockerfile`-tiedoston juuresta automaattisesti.
4. Asetukset:
   - **Exposed Port:** `3001`
   - **Environment Variables:** katso [.env.example](.env.example) — minimissään mitään ei pakko asettaa (oletukset toimivat).
   - **Persistent Storage:** lisää volume → *Mount Path* `/app/data-storage` (pakollinen, muuten käyttäjädata katoaa uudelleenjunauksessa).
5. **Deploy**. Valmis.

## Tapa 2: Docker Compose

1. Coolify → **New Resource** → **Docker Based** → *Docker Compose* → valitse repo.
2. Coolify lukee `docker-compose.yml` ja rakentaa palvelun `app`.
3. Lisää sama pysyvä volume (`/app/data-storage`) resurssin asetuksista, jos
   haluat hallita sitä Coolifyn UI:sta eikä compose-tiedostosta.
4. **Deploy**.

> Compose-tiedostossa ei ole host-porttimappingia tahallaan — Coolify proxyaa
> liikenteen kontin exposed porttiin 3001 itse. Paikallisessa testissä
> kommentoi `ports:`-rivit esiin.

## Tapa 3: Valmis image (rekisteristä)

Jos haluat rakentaa imagen itse ja viedä sen rekisteriin (esim. ghcr.io):

```bash
docker build -t ghcr.io/<OMA_TUNNUS>/metsastaja-akatemia:1.0.0 .
docker push ghcr.io/<OMA_TUNNUS>/metsastaja-akatemia:1.0.0
```

Coolify → **New Resource** → **Docker Based** → *Docker Image* →
kirjoita imagen nimi. Muista silti:
- Exposed Port `3001`
- Persistent Storage `/app/data-storage`

---

## Verkkotunnus ja TLS

Coolifyssa: resurssin **Domains**-kenttään esimerkiksi `harjoittelu.example.fi`.
Coolify (Traefik) hoitaa Let's Encrypt -sertifikaatin automaattisesti. Sovellus
tarjoilee `service workerin`, joten **HTTPS on pakollinen** PWA:n asennettavuudelle
(puhelin) — paikallisessa testauksessa `http://localhost` kelpaa.

## Päivitykset

- Coolify nappaa uuden commitin automaattisesti, jos **Webhook / Auto Deploy** on päällä.
- Image-tavalla: päivitä tag ja paina **Redeploy**.
- Käyttäjädata on volumessa eikä katoa päivityksissä.

## Tiedostorakenne kontissa

```
/app
├── server/dist/        REST-API + staattinen tiedosto serving
├── client/dist/        prod-käännetty React/PWA (+ service worker)
├── data/               kysymyspankki, lajit, kuvatietokanta (bundle.json)
├── node_modules/       tuotantoripponenssit
└── data-storage/       ← pysyvä volume (käyttäjäprofiilit JSON, uploadit)
```

## Tarkistuslistan deploy jälkeen

```bash
curl https://<osoite>/api/health          # {"status":"ok"}
curl https://<osoite>/api/meta            # kysymysten ja lajien määrät
```

Selaimessa: etusivu latautuu, lajinäkymässä 72 lajia kuvineen, koe käynnistyy.

## Muistio sisällöstä

Kuvat on haettu Wikimedia Commonsista lisenssitietoineen (ks. README).
Uusien kuvien haku (`npm run images`) vaatii verkkoyhteyden — se ei kuulu
deploy-putkeen, vaan ajetaan kehityskoneella ja commitoidaan data mukana.
