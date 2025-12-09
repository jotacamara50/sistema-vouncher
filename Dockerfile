FROM node:18-slim

WORKDIR /app

# Backend
COPY backend ./backend

# Frontend (estático)
COPY frontend ./frontend

# Scripts adicionais (opcional)
COPY scripts ./scripts

RUN cd backend && npm install --production

EXPOSE 3000

CMD ["node", "backend/server.js"]

