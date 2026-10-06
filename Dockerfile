# Monivaiheinen build: käyttöliittymä + palvelin samassa kontissa.
# Palvelin tarjoilee sekä /api-reitit että client/dist-kansion.
#
# Coolify-yhteensopivuus:
#  - kuuntelee 0.0.0.0:$PORT (Coolify voi asettaa portin vapaasti)
#  - EXPOSE 3001 auttaa Coolifyn portintunnistuksessa
#  - HEALTHCHECK /api/health -päätepisteeseen
#  - pysyvä tila DATA_DIR-kansiossa (kytketään volumeksi Coolifyssa)
#
# Paikallinen testi:  docker build -t metsastaja-akatemia . && docker run -p 3001:3001 metsastaja-akatemia

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY scripts ./scripts
COPY data ./data
RUN npm install --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
# Käyttäjien edistymistallennus (JSON) + admin-uploadit tähän kansioon.
# Kytkä Coolifyssa pysyvä volume tähän polkuun, jotta data säilyy päivityksissä.
ENV DATA_DIR=/app/data-storage

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/data ./data
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /app/data-storage && chown -R node:node /app/data-storage
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
