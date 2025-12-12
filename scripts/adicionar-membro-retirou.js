// Script para adicionar campo membro_retirou_id na tabela familias
const db = require('../backend/config/database');

console.log('Adicionando campo membro_retirou_id...');

db.run(`ALTER TABLE familias ADD COLUMN membro_retirou_id INTEGER`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ Campo já existe');
    } else {
      console.error('❌ Erro:', err.message);
    }
  } else {
    console.log('✅ Campo membro_retirou_id adicionado com sucesso!');
  }
  process.exit();
});
