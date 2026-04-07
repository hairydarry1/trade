FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production \
    TZ=UTC \
    PORT=8000

COPY Desktop/pairs/backend/package*.json ./Desktop/pairs/backend/
RUN cd Desktop/pairs/backend && npm ci --only=production

COPY Desktop/pairs/backend/src ./Desktop/pairs/backend/src

EXPOSE 8000

CMD ["node", "Desktop/pairs/backend/src/server.js"]