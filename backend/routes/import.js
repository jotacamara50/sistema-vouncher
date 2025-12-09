const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Configurar upload
const upload = multer({ dest: 'uploads/' });

// Rota protegida para importação
router.post('/planilha', authMiddleware, upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não enviado' });
  }

  try {
    // Ler planilha
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = xlsx.utils.sheet_to_json(sheet);

    let importados = 0;
    let ignorados = 0;
    const erros = [];

    // Processar cada linha
    dados.forEach((linha, index) => {
      const codFamiliar = linha.COD_FAMILIAR || linha['COD FAMILIAR'] || linha.cod_familiar;
      const nome = linha.NOME || linha.nome;
      const cpf = (linha.CPF || linha.cpf || '').toString().replace(/[.\-]/g, '');
      const nis = (linha.NIS || linha.nis || '').toString();
      const endereco = linha.ENDERECO || linha.endereco || '';
      const bairro = linha.BAIRRO || linha.bairro || '';
      const telefone = (linha.TELEFONE1 || linha.TELEFONE || linha.telefone || '').toString();

      if (!codFamiliar || !nome || !cpf || !nis) {
        erros.push(`Linha ${index + 2}: Dados obrigatórios faltando`);
        return;
      }

      // Verificar se já existe
      db.get(
        'SELECT id FROM familias WHERE cod_familiar = ?',
        [codFamiliar],
        (err, row) => {
          if (err) {
            erros.push(`Linha ${index + 2}: Erro ao verificar existência`);
            return;
          }

          if (row) {
            ignorados++;
            return;
          }

          // Inserir nova família
          db.run(
            `INSERT INTO familias (cod_familiar, nome_responsavel, cpf, nis, endereco, bairro, telefone)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [codFamiliar, nome, cpf, nis, endereco, bairro, telefone],
            (err) => {
              if (err) {
                erros.push(`Linha ${index + 2}: ${err.message}`);
              } else {
                importados++;
              }
            }
          );
        }
      );
    });

    // Aguardar processamento e retornar resultado
    setTimeout(() => {
      res.json({
        message: 'Importação concluída',
        total: dados.length,
        importados,
        ignorados,
        erros: erros.length > 0 ? erros : null
      });
    }, 2000);

  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar planilha: ' + error.message });
  }
});

module.exports = router;
