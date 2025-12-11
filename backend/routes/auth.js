const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { SECRET_KEY } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ error: 'Login e senha são obrigatórios' });
  }

  db.get(
    'SELECT * FROM usuarios WHERE login = ? AND ativo = 1',
    [login],
    async (err, usuario) => {
      if (err) {
        return res.status(500).json({ error: 'Erro no servidor' });
      }

      if (!usuario) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      const token = jwt.sign(
        { 
          id: usuario.id, 
          nome: usuario.nome, 
          unidade: usuario.unidade,
          tipo: usuario.tipo 
        },
        SECRET_KEY,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          login: usuario.login,
          unidade: usuario.unidade,
          tipo: usuario.tipo
        }
      });
    }
  );
});

// Criar primeiro usuário (rota temporária)
router.post('/criar-admin', async (req, res) => {
  const { nome, login, senha, unidade, tipo } = req.body;

  if (!unidade) {
    return res.status(400).json({ error: 'Unidade é obrigatória' });
  }

  const tipoUsuario = tipo || 'atendente';

  if (!['atendente', 'fiscal', 'master'].includes(tipoUsuario)) {
    return res.status(400).json({ error: 'Tipo deve ser "atendente", "fiscal" ou "master"' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  db.run(
    'INSERT INTO usuarios (nome, login, senha, unidade, tipo) VALUES (?, ?, ?, ?, ?)',
    [nome, login, senhaHash, unidade, tipoUsuario],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar usuário' });
      }
      res.json({ message: 'Usuário criado com sucesso', id: this.lastID });
    }
  );
});

module.exports = router;
