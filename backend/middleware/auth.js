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
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { authMiddleware, SECRET_KEY };
