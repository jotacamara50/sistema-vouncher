const xlsx = require('xlsx');

const caminhoArquivo = process.argv[2];

if (!caminhoArquivo) {
  console.error('❌ Erro: Forneça o caminho da planilha');
  console.log('Uso: node scripts/verificar-colunas.js "caminho/planilha.xlsx"');
  process.exit(1);
}

console.log('\n📊 VERIFICANDO ESTRUTURA DA PLANILHA');
console.log('='.repeat(60));
console.log(`📂 Arquivo: ${caminhoArquivo}\n`);

try {
  const workbook = xlsx.readFile(caminhoArquivo);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const dados = xlsx.utils.sheet_to_json(sheet);

  console.log(`📋 Planilha: ${sheetName}`);
  console.log(`📊 Total de linhas: ${dados.length}\n`);

  if (dados.length > 0) {
    console.log('📌 COLUNAS ENCONTRADAS:');
    console.log('='.repeat(60));
    const colunas = Object.keys(dados[0]);
    colunas.forEach((coluna, index) => {
      console.log(`${index + 1}. ${coluna}`);
    });

    console.log('\n📝 PRIMEIRA LINHA (EXEMPLO):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(dados[0], null, 2));
  } else {
    console.log('⚠️  A planilha está vazia!');
  }
} catch (error) {
  console.error('❌ Erro ao ler planilha:', error.message);
  process.exit(1);
}
