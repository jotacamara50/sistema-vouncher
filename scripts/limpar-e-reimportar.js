const db = require('../backend/config/database');
const xlsx = require('xlsx');

console.log('🧹 LIMPEZA E REIMPORTAÇÃO DE DADOS');
console.log('='.repeat(60));

// 1. Limpar banco de dados
console.log('🗑️  Limpando banco de dados...');

db.serialize(() => {
  db.run('DELETE FROM membros', (err) => {
    if (err) {
      console.error('❌ Erro ao limpar membros:', err.message);
      process.exit(1);
    }
    console.log('✅ Tabela membros limpa');
  });

  db.run('DELETE FROM familias', (err) => {
    if (err) {
      console.error('❌ Erro ao limpar familias:', err.message);
      process.exit(1);
    }
    console.log('✅ Tabela familias limpa');
  });

  // NÃO limpar usuários (preservar atendentes e fiscais)
  console.log('⚠️  Usuários preservados (não foram apagados)');

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

    let familiasImportadas = 0;
    let membrosImportados = 0;
    let erros = 0;
    
    // Agrupar dados por código familiar
    const familias = {};
    
    dados.forEach((linha, index) => {
      const codFamiliar = linha.COD_FAMILIAR || linha['COD FAMILIAR'] || linha.cod_familiar;
      const nome = linha.NOME || linha.nome;
      
      // CPF e NIS com zeros à esquerda
      let cpf = (linha.CPF || linha.cpf || '').toString().replace(/[.\-\s]/g, '');
      cpf = cpf.padStart(11, '0');
      
      let nis = (linha.NIS || linha.nis || '').toString().replace(/[.\-\s]/g, '');
      nis = nis.padStart(11, '0');
      
      const endereco = linha.ENDERECO || linha.endereco || '';
      const bairro = linha.BAIRRO || linha.bairro || '';
      const telefone = (linha.TELEFONE1 || linha.TELEFONE || linha.telefone || '').toString();
      
      // Validação
      if (!codFamiliar || !nome || !cpf || !nis) {
        console.log(`⚠️  Linha ${index + 2}: Dados obrigatórios faltando - IGNORADO`);
        erros++;
        return;
      }
      
      // Agrupar por código familiar
      if (!familias[codFamiliar]) {
        familias[codFamiliar] = {
          endereco,
          bairro,
          telefone,
          membros: []
        };
      }
      
      // Adicionar membro
      familias[codFamiliar].membros.push({ nome, cpf, nis });
    });

    console.log(`👨‍👩‍👧‍👦 Total de famílias encontradas: ${Object.keys(familias).length}`);
    console.log('');

    // Inserir famílias e membros
    const codsFamiliares = Object.keys(familias);
    let processed = 0;

    const processarFamilia = (codFamiliar) => {
      return new Promise((resolve) => {
        const familia = familias[codFamiliar];
        
        // Usar primeiro membro como responsável
        const nomeResponsavel = familia.membros.length > 0 ? familia.membros[0].nome : 'SEM NOME';
        
        // Inserir família
        db.run(
          `INSERT INTO familias (cod_familiar, nome_responsavel, endereco, bairro, telefone) VALUES (?, ?, ?, ?, ?)`,
          [codFamiliar, nomeResponsavel, familia.endereco, familia.bairro, familia.telefone],
          function(err) {
            if (err) {
              console.error(`❌ Família ${codFamiliar}: Erro ao inserir - ${err.message}`);
              erros++;
              resolve();
              return;
            }
            
            const familiaId = this.lastID;
            familiasImportadas++;
            
            // Inserir membros
            let membrosInseridos = 0;
            familia.membros.forEach((membro, idx) => {
              db.run(
                `INSERT INTO membros (familia_id, cod_familiar, nome, cpf, nis) VALUES (?, ?, ?, ?, ?)`,
                [familiaId, codFamiliar, membro.nome, membro.cpf, membro.nis],
                (err) => {
                  if (err) {
                    console.error(`❌ Membro ${membro.nome}: Erro - ${err.message}`);
                  } else {
                    membrosInseridos++;
                    membrosImportados++;
                  }
                  
                  // Quando todos os membros forem processados
                  if (membrosInseridos === familia.membros.length) {
                    console.log(`✅ Família ${codFamiliar}: ${familia.membros.length} membro(s) importado(s)`);
                    resolve();
                  }
                }
              );
            });
          }
        );
      });
    };

    // Processar todas as famílias
    (async () => {
      for (const codFamiliar of codsFamiliares) {
        await processarFamilia(codFamiliar);
      }

      // Resumo final
      console.log('');
      console.log('='.repeat(60));
      console.log('📊 RESUMO DA IMPORTAÇÃO');
      console.log('='.repeat(60));
      console.log(`👨‍👩‍👧‍👦 Famílias importadas: ${familiasImportadas}`);
      console.log(`👤 Membros importados: ${membrosImportados}`);
      console.log(`❌ Erros: ${erros}`);
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
