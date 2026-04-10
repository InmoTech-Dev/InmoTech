FROM node:20-alpine
WORKDIR /app

RUN apk update && apk upgrade --no-cache

COPY api/package*.json ./
RUN npm ci --only=production

COPY api/ .

# Copiar shared desde donde realmente está: frontend/shared/
COPY frontend/shared/ /frontend/shared/

EXPOSE 5000
CMD ["node", "-r", "./src/config/loadEnv.js", "src/server.js"]