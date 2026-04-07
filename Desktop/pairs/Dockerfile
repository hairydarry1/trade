FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata

ENV NODE_ENV=production \
    TZ=UTC \
    PORT=8000

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/src ./src

EXPOSE 8000

CMD ["node", "src/server.js"]