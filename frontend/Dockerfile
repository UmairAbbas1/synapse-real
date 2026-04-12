# Synapse frontend — production: `next build` + `next start`.
# docker-compose.dev.yml overrides CMD for `next dev` with bind mounts.
FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
CMD ["npm", "run", "start"]
