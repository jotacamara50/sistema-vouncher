FROM node:18-slim

WORKDIR /app

COPY backend ./backend
COPY frontend ./frontend
COPY scripts ./scripts

RUN cd backend && npm install --production

EXPOSE 3000

CMD ["node", "backend/server.js"]


