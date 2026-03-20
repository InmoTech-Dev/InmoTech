FROM node:20-alpine
WORKDIR /app

COPY api/package*.json ./
RUN npm ci --only=production

COPY api/ .

# Copiar shared desde donde realmente está: frontend/shared/
COPY frontend/shared/ /frontend/shared/

EXPOSE 5000
CMD ["node", "-r", "dotenv/config", "src/server.js"]