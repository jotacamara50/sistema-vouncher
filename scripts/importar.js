const xlsx = require('xlsx');
const db = require('../backend/config/database');
const path = require('path');

// Configurar o caminho do arquivo da planilha
const CAMINHO_PLANILHA = process.argv[2] || './dados.xlsx';

console.log('='.repeat(60));
console.log('📊 IMPORTADOR DE FAMÍLIAS - Sistema de Vouchers');
console.log('='.repeat(60));

if (!CAMINHO_PLANILHA) {
  console.error('❌ Erro: Forneça o caminho da planilha');
  console.log('Uso: npm run import caminho/para/planilha.xlsx');
  process.exit(1);
}

try {
  console.log(`📂 Lendo planilha: ${CAMINHO_PLANILHA}`);
  
  // Ler arquivo Excel/CSV
  const workbook = xlsx.readFile(CAMINHO_PLANILHA);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const dados = xlsx.utils.sheet_to_json(sheet);

  console.log(`📋 Total de linhas na planilha: ${dados.length}`);
  console.log('');

  let importados = 0;
  let ignorados = 0;
  let erros = 0;

  // Processar cada linha
  const processarLinha = (linha, index) => {
    return new Promise((resolve) => {
      // Extrair dados (suporta diferentes formatos de coluna)
      const codFamiliar = linha.COD_FAMILIAR || linha['COD FAMILIAR'] || linha.cod_familiar;
      const nome = linha.NOME || linha.nome;
      const cpf = (linha.CPF || linha.cpf || '').toString().replace(/[.\-\s]/g, '');
      const nis = (linha.NIS || linha.nis || '').toString().replace(/[.\-\s]/g, '');
      const endereco = linha.ENDERECO || linha.endereco || '';
      const bairro = linha.BAIRRO || linha.bairro || '';
      const telefone = (linha.TELEFONE1 || linha.TELEFONE || linha.telefone || '').toString();

      // Validação básica
      if (!codFamiliar || !nome || !cpf || !nis) {
        console.log(`⚠️  Linha ${index + 2}: Dados obrigatórios faltando - IGNORADO`);
        erros++;
        resolve();
        return;
      }

      // Verificar se a família já existe (pelo código familiar)
      db.get(
        'SELECT id FROM familias WHERE cod_familiar = ?',
        [codFamiliar],
        (err, row) => {
          if (err) {
            console.error(`❌ Linha ${index + 2}: Erro no banco - ${err.message}`);
            erros++;
            resolve();
            return;
          }

          if (row) {
            console.log(`⏭️  Linha ${index + 2}: Código Familiar ${codFamiliar} já existe - IGNORADO`);
            ignorados++;
            resolve();
            return;
          }

          // Inserir nova família
          db.run(
            `INSERT INTO familias (cod_familiar, nome_responsavel, cpf, nis, endereco, bairro, telefone)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [codFamiliar, nome, cpf, nis, endereco, bairro, telefone],
            (err) => {
              if (err) {
                console.error(`❌ Linha ${index + 2}: Erro ao inserir - ${err.message}`);
                erros++;
              } else {
                console.log(`✅ Linha ${index + 2}: ${nome} (${codFamiliar}) - IMPORTADO`);
                importados++;
              }
              resolve();
            }
          );
        }
      );
    });
  };

  // Processar todas as linhas sequencialmente
  (async () => {
    for (let i = 0; i < dados.length; i++) {
      await processarLinha(dados[i], i);
    }

    // Resumo final
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 RESUMO DA IMPORTAÇÃO');
    console.log('='.repeat(60));
    console.log(`Total de linhas:      ${dados.length}`);
    console.log(`✅ Importados:         ${importados}`);
    console.log(`⏭️  Ignorados:          ${ignorados}`);
    console.log(`❌ Erros:              ${erros}`);
    console.log('='.repeat(60));

    // Fechar conexão com banco
    db.close(() => {
      console.log('✅ Importação concluída!');
      process.exit(0);
    });
  })();

} catch (error) {
  console.error('❌ Erro ao processar planilha:', error.message);
  process.exit(1);
}
