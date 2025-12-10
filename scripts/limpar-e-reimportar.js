const db = require('../backend/config/database');
const xlsx = require('xlsx');

console.log('🧹 LIMPEZA E REIMPORTAÇÃO DE DADOS');
console.log('='.repeat(60));

// 1. Limpar banco de dados
console.log('🗑️  Limpando banco de dados...');

db.serialize(() => {
  // Limpar tabelas
  db.run('DELETE FROM familias', (err) => {
    if (err) {
      console.error('❌ Erro ao limpar familias:', err.message);
      process.exit(1);
    }
    console.log('✅ Tabela familias limpa');
  });

  db.run('DELETE FROM usuarios', (err) => {
    if (err) {
      console.error('❌ Erro ao limpar usuarios:', err.message);
      process.exit(1);
    }
    console.log('✅ Tabela usuarios limpa');
  });

  // Aguardar limpeza e iniciar importação
  setTimeout(() => {
    iniciarImportacao();
  }, 1000);
});

function iniciarImportacao() {
  const CAMINHO_PLANILHA = process.argv[2];

  if (!CAMINHO_PLANILHA) {
    console.error('❌ Erro: Forneça o caminho da planilha');
    console.log('Uso: node scripts/limpar-e-reimportar.js "caminho/planilha.xlsx"');
    process.exit(1);
  }

  console.log('');
  console.log('📊 INICIANDO IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`📂 Lendo planilha: ${CAMINHO_PLANILHA}`);

  try {
    // Ler arquivo Excel
    const workbook = xlsx.readFile(CAMINHO_PLANILHA);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = xlsx.utils.sheet_to_json(sheet);

    console.log(`📋 Total de linhas: ${dados.length}`);
    console.log('');

    let importados = 0;
    let ignorados = 0;
    let erros = 0;

    // Processar cada linha
    const processarLinha = (linha, index) => {
      return new Promise((resolve) => {
        // Extrair dados
        const codFamiliar = linha.COD_FAMILIAR || linha['COD FAMILIAR'] || linha.cod_familiar;
        const nome = linha.NOME || linha.nome;
        
        // CPF: remover formatação e completar com zeros à esquerda
        let cpf = (linha.CPF || linha.cpf || '').toString().replace(/[.\-\s]/g, '');
        cpf = cpf.padStart(11, '0');
        
        // NIS: remover formatação e completar com zeros à esquerda
        let nis = (linha.NIS || linha.nis || '').toString().replace(/[.\-\s]/g, '');
        nis = nis.padStart(11, '0');
        
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

        // Verificar se a família já existe
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
              console.log(`⏭️  Linha ${index + 2}: Código ${codFamiliar} já existe - IGNORADO`);
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
                  console.log(`✅ Linha ${index + 2}: ${nome} (CPF: ${cpf}) - IMPORTADO`);
                  importados++;
                }
                resolve();
              }
            );
          }
        );
      });
    };

    // Processar todas as linhas
    (async () => {
      for (let i = 0; i < dados.length; i++) {
        await processarLinha(dados[i], i);
      }

      // Resumo final
      console.log('');
      console.log('='.repeat(60));
      console.log('📊 RESUMO DA IMPORTAÇÃO');
      console.log('='.repeat(60));
      console.log(`✅ Importados com sucesso: ${importados}`);
      console.log(`⏭️  Ignorados (duplicados): ${ignorados}`);
      console.log(`❌ Erros (dados incompletos): ${erros}`);
      console.log('='.repeat(60));

      db.close(() => {
        console.log('✅ Importação concluída!');
        process.exit(0);
      });
    })();

  } catch (error) {
    console.error('❌ Erro ao ler planilha:', error.message);
    process.exit(1);
  }
}
