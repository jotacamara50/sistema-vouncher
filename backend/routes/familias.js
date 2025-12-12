const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { gerarReciboPDF } = require('../utils/pdfGenerator');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Buscar família por CPF, NIS ou Nome
router.get('/buscar', (req, res) => {
  const { termo } = req.query;

  if (!termo) {
    return res.status(400).json({ error: 'Termo de busca obrigatório' });
  }

  // Remover caracteres especiais para busca por CPF
  const termoLimpo = termo.replace(/[.\-]/g, '');

  // Buscar famílias e pegar o nome do primeiro membro que corresponde à busca
  const sql = `
    SELECT f.*, 
           (SELECT COUNT(*) FROM membros WHERE cod_familiar = f.cod_familiar) as total_membros,
           (SELECT m2.nome FROM membros m2 
            WHERE m2.cod_familiar = f.cod_familiar 
            AND (m2.cpf = ? OR m2.nis = ? OR m2.nome LIKE ?)
            LIMIT 1) as nome_membro_buscado
    FROM familias f
    WHERE f.cod_familiar IN (
      SELECT DISTINCT m.cod_familiar 
      FROM membros m 
      WHERE m.cpf = ? 
      OR m.nis = ? 
      OR m.nome LIKE ?
      OR m.cod_familiar LIKE ?
    )
    ORDER BY f.cod_familiar
    LIMIT 50
  `;

  db.all(
    sql,
    [termoLimpo, termoLimpo, `%${termo}%`, termoLimpo, termoLimpo, `%${termo}%`, `%${termo}%`],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar famílias:', err);
        return res.status(500).json({ error: 'Erro ao buscar famílias' });
      }
      res.json(rows);
    }
  );
});

// Obter família por ID com membros
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT f.*, u.nome as operador_nome, u.unidade as operador_unidade
     FROM familias f
     LEFT JOIN usuarios u ON f.usuario_entregou_id = u.id
     WHERE f.id = ?`,
    [id],
    (err, familia) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar família' });
      }
      if (!familia) {
        return res.status(404).json({ error: 'Família não encontrada' });
      }
      
      // Buscar membros da família
      db.all(
        'SELECT * FROM membros WHERE cod_familiar = ? ORDER BY nome',
        [familia.cod_familiar],
        (err, membros) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar membros' });
          }
          
          // Retornar família com membros
          res.json({
            ...familia,
            membros: membros || []
          });
        }
      );
    }
  );
});

// Vincular voucher à família
router.post('/:id/vincular-voucher', (req, res) => {
  const { id } = req.params;
  const { numero_voucher, membro_retirou_id } = req.body;
  const usuario_id = req.userId;

  if (!numero_voucher) {
    return res.status(400).json({ error: 'Número do voucher obrigatório' });
  }

  if (!membro_retirou_id) {
    return res.status(400).json({ error: 'É obrigatório selecionar quem está retirando o voucher' });
  }

  // Verificar se o número do voucher já foi usado
  db.get(
    'SELECT * FROM familias WHERE numero_voucher = ?',
    [numero_voucher],
    (err, voucherExistente) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar voucher' });
      }

      if (voucherExistente) {
        return res.status(400).json({ 
          error: 'Este número de voucher já foi usado por outra família' 
        });
      }

      // Verificar se a família já tem voucher e validar renda
      db.get('SELECT * FROM familias WHERE id = ?', [id], (err, familia) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar família' });
        }

        if (!familia) {
          return res.status(404).json({ error: 'Família não encontrada' });
        }

        if (familia.numero_voucher) {
          return res.status(400).json({ 
            error: 'Esta família já possui um voucher vinculado' 
          });
        }

        // VALIDAÇÃO: Verificar se renda média está acima do limite
        if (familia.renda_media && parseFloat(familia.renda_media) > 218) {
          return res.status(400).json({ 
            error: 'Esta família não é elegível para receber voucher. Renda média acima do limite de R$ 218,00.' 
          });
        }

        // Vincular voucher
        db.run(
          `UPDATE familias 
           SET numero_voucher = ?, 
               data_entrega_voucher = datetime('now', 'localtime'),
               usuario_entregou_id = ?,
               membro_retirou_id = ?
           WHERE id = ?`,
          [numero_voucher, usuario_id, membro_retirou_id, id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Erro ao vincular voucher' });
            }

            res.json({ 
              message: 'Voucher vinculado com sucesso',
              numero_voucher,
              data_entrega: new Date().toISOString()
            });
          }
        );
      });
    }
  );
});

// Entregar kit de alimentação
router.post('/:id/entregar-kit', (req, res) => {
  const { id } = req.params;
  const { numero_voucher } = req.body;
  const usuario_id = req.userId;

  if (!numero_voucher) {
    return res.status(400).json({ error: 'Número do voucher obrigatório para validação' });
  }

  db.get('SELECT * FROM familias WHERE id = ?', [id], (err, familia) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar família' });
    }

    if (!familia) {
      return res.status(404).json({ error: 'Família não encontrada' });
    }

    if (!familia.numero_voucher) {
      return res.status(400).json({ 
        error: 'Esta família ainda não recebeu o voucher' 
      });
    }

    if (familia.data_entrega_kit) {
      return res.status(400).json({ 
        error: 'Esta família já recebeu o kit de alimentação' 
      });
    }

    // Validar número do voucher
    if (parseInt(numero_voucher) !== parseInt(familia.numero_voucher)) {
      return res.status(400).json({ 
        error: 'Número do voucher não corresponde ao registrado' 
      });
    }

    // Registrar entrega do kit
    db.run(
      `UPDATE familias 
       SET data_entrega_kit = datetime('now', 'localtime'),
           usuario_entregou_id = ?
       WHERE id = ?`,
      [usuario_id, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao registrar entrega do kit' });
        }

        // Buscar membros antes de gerar PDF
        db.all(
          'SELECT * FROM membros WHERE cod_familiar = ? ORDER BY nome',
          [familia.cod_familiar],
          (err, membros) => {
            if (err) {
              return res.status(500).json({ error: 'Erro ao buscar membros' });
            }

            // Adicionar membros ao objeto familia
            familia.membros = membros || [];

            // Gerar PDF do recibo com membros
            gerarReciboPDF(familia, (pdfPath) => {
              res.json({ 
                message: 'Kit entregue com sucesso',
                data_entrega: new Date().toISOString(),
                recibo_pdf: pdfPath
              });
            });
          }
        );
      }
    );
  });
});

// Estatísticas gerais
router.get('/stats/geral', (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as total FROM familias', (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
    stats.total_familias = row.total;

    db.get('SELECT COUNT(*) as total FROM familias WHERE numero_voucher IS NOT NULL', (err, row) => {
      stats.vouchers_entregues = row.total;

      db.get('SELECT COUNT(*) as total FROM familias WHERE data_entrega_kit IS NOT NULL', (err, row) => {
        stats.kits_entregues = row.total;

        res.json(stats);
      });
    });
  });
});

module.exports = router;
