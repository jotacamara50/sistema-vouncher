FROM node:18 AS builder
WORKDIR /app

# Copia tudo
COPY . .

# Instala dependências
RUN npm install --force
RUN cd frontend && npm install --force && npm run build

# Move build para dentro do backend
RUN mkdir -p backend/frontend && cp -R frontend/dist/* backend/frontend/

FROM node:18-slim AS runner
WORKDIR /app

# Copia apenas backend + frontend já compilado
COPY --from=builder /app/backend ./backend

# Instala apenas dependências do backend
RUN npm install --production --prefix backend --force

EXPOSE 3000
CMD ["node", "backend/server.js"]
