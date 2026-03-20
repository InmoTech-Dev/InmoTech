FROM node:20-alpine
WORKDIR /app

# Copiar package.json del api
COPY api/package*.json ./
RUN npm ci --only=production

# Copiar el código del api
COPY api/ .

# Copiar la carpeta shared al lugar donde el código la espera
COPY shared/ /frontend/shared/

EXPOSE 5000
CMD ["node", "-r", "dotenv/config", "src/server.js"]