const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, fiscalMiddleware } = require('../middleware/auth');

// Todas as rotas requerem autenticação E permissão de fiscal
router.use(authMiddleware);
router.use(fiscalMiddleware);

// Relatório de entregas por unidade
router.get('/entregas', (req, res) => {
  const { data_inicio, data_fim, usuario_id, unidade } = req.query;
  const userUnidade = req.userUnidade;
  const userTipo = req.userTipo;

  let sql = `
    SELECT 
      f.id,
      f.cod_familiar,
      f.endereco,
      f.bairro,
      f.telefone,
      f.numero_voucher,
      f.data_entrega_voucher,
      f.data_entrega_kit,
      u.nome as usuario_nome,
      u.unidade as usuario_unidade,
      (SELECT COUNT(*) FROM membros WHERE cod_familiar = f.cod_familiar) as total_membros
    FROM familias f
    LEFT JOIN usuarios u ON f.usuario_entregou_id = u.id
    WHERE 1=1
  `;

  const params = [];

  // Master pode filtrar por qualquer unidade, fiscal só vê sua unidade
  if (userTipo !== 'master') {
    sql += ` AND u.unidade = ?`;
    params.push(userUnidade);
  } else if (unidade) {
    sql += ` AND u.unidade = ?`;
    params.push(unidade);
  }

  // Filtro por data
  if (data_inicio) {
    sql += ` AND date(f.data_entrega_voucher) >= date(?)`;
    params.push(data_inicio);
  }

  if (data_fim) {
    sql += ` AND date(f.data_entrega_voucher) <= date(?)`;
    params.push(data_fim);
  }

  // Filtro por usuário específico
  if (usuario_id) {
    sql += ` AND f.usuario_entregou_id = ?`;
    params.push(usuario_id);
  }

  sql += ` ORDER BY f.data_entrega_voucher DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar relatório:', err);
      return res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
    res.json(rows);
  });
});

// Estatísticas da unidade
router.get('/estatisticas', (req, res) => {
  const { unidade } = req.query;
  const userUnidade = req.userUnidade;
  const userTipo = req.userTipo;
  
  // Master pode ver qualquer unidade, fiscal só a sua
  const unidadeFiltro = (userTipo === 'master' && unidade) ? unidade : userUnidade;
  const stats = {};

  // Condição SQL para filtro de unidade
  const whereSql = unidadeFiltro ? 'WHERE u.unidade = ?' : 'WHERE 1=1';
  const whereParams = unidadeFiltro ? [unidadeFiltro] : [];

  // Total de famílias atendidas pela unidade
  db.get(
    `SELECT COUNT(DISTINCT f.id) as total
     FROM familias f
     INNER JOIN usuarios u ON f.usuario_entregou_id = u.id
     ${whereSql}`,
    whereParams,
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
      }
      stats.total_familias_atendidas = row.total || 0;

      // Vouchers entregues
      db.get(
        `SELECT COUNT(*) as total
         FROM familias f
         INNER JOIN usuarios u ON f.usuario_entregou_id = u.id
         ${whereSql} ${unidadeFiltro ? 'AND' : 'WHERE'} f.numero_voucher IS NOT NULL`,
        whereParams,
        (err, row) => {
          stats.vouchers_entregues = row.total || 0;

          // Kits entregues
          db.get(
            `SELECT COUNT(*) as total
             FROM familias f
             INNER JOIN usuarios u ON f.usuario_entregou_id = u.id
             ${whereSql} ${unidadeFiltro ? 'AND' : 'WHERE'} f.data_entrega_kit IS NOT NULL`,
            whereParams,
            (err, row) => {
              stats.kits_entregues = row.total || 0;

              // Total de membros atendidos
              db.get(
                `SELECT COUNT(m.id) as total
                 FROM membros m
                 INNER JOIN familias f ON m.cod_familiar = f.cod_familiar
                 INNER JOIN usuarios u ON f.usuario_entregou_id = u.id
                 ${whereSql}`,
                whereParams,
                (err, row) => {
                  stats.total_pessoas_atendidas = row.total || 0;

                  // Por atendente
                  db.all(
                    `SELECT 
                       u.nome,
                       COUNT(DISTINCT f.id) as familias_atendidas,
                       SUM(CASE WHEN f.numero_voucher IS NOT NULL THEN 1 ELSE 0 END) as vouchers,
                       SUM(CASE WHEN f.data_entrega_kit IS NOT NULL THEN 1 ELSE 0 END) as kits
                     FROM usuarios u
                     LEFT JOIN familias f ON u.id = f.usuario_entregou_id
                     ${unidadeFiltro ? 'WHERE u.unidade = ?' : 'WHERE 1=1'}
                     GROUP BY u.id, u.nome
                     ORDER BY familias_atendidas DESC`,
                    unidadeFiltro ? [unidadeFiltro] : [],
                    (err, rows) => {
                      stats.por_atendente = rows || [];
                      res.json(stats);
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Listar usuários da unidade (para filtro)
router.get('/usuarios', (req, res) => {
  const unidade = req.userUnidade;

  db.all(
    'SELECT id, nome, tipo FROM usuarios WHERE unidade = ? AND ativo = 1 ORDER BY nome',
    [unidade],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar usuários' });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
