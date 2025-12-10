const jwt = require('jsonwebtoken');

const SECRET_KEY = 'sua-chave-secreta-aqui-mude-em-producao';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.id;
    req.userName = decoded.nome;
    req.userUnidade = decoded.unidade;
    req.userTipo = decoded.tipo;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para permitir apenas fiscais
const fiscalMiddleware = (req, res, next) => {
  if (req.userTipo !== 'fiscal') {
    return res.status(403).json({ error: 'Acesso negado. Apenas fiscais podem acessar relatórios.' });
  }
  next();
};

module.exports = { authMiddleware, fiscalMiddleware, SECRET_KEY };
