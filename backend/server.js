const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir PDFs gerados
app.use('/pdfs', express.static(path.join(__dirname, '../pdfs')));

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/familias', require('./routes/familias'));
app.use('/api/import', require('./routes/import'));

// Rota raiz - redirecionar para login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Sistema de Vouchers - CRAS/Bolsa Família');
  console.log('='.repeat(50));
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});

module.exports = app;
