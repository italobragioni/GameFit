# Dockerfile do worker de processamento.
# Contexto de build = RAIZ do repositório:
#   docker build -f apps/worker/Dockerfile -t editor-worker .
#
# O FFmpeg vem do pacote ffmpeg-static (baixado no npm install), então não é
# preciso instalar o FFmpeg do sistema.

FROM node:20-slim AS build
WORKDIR /app

# manifestos primeiro (melhor cache)
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/worker/package.json apps/worker/
RUN npm install

# código e build
COPY packages/shared packages/shared
COPY apps/worker apps/worker
RUN npm run build:shared && npm run build --workspace=@editor/worker

# --- imagem final enxuta ---
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# pasta de temporários
RUN mkdir -p /app/apps/worker/tmp
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
