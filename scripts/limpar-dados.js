const db = require('../backend/config/database');

console.log('🧹 Script de Limpeza de Dados de Teste');
console.log('='.repeat(50));

// Opção 1: Limpar TODOS os vouchers e kits (mantém famílias)
function limparEntregas() {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE familias 
       SET numero_voucher = NULL, 
           data_entrega_voucher = NULL, 
           data_entrega_kit = NULL, 
           usuario_entregou_id = NULL`,
      (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Todos os vouchers e kits foram removidos');
          console.log('✅ Famílias mantidas intactas');
          resolve();
        }
      }
    );
  });
}

// Opção 2: Limpar apenas vouchers específicos
function limparVoucherEspecifico(numeroVoucher) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE familias 
       SET numero_voucher = NULL, 
           data_entrega_voucher = NULL, 
           data_entrega_kit = NULL, 
           usuario_entregou_id = NULL
       WHERE numero_voucher = ?`,
      [numeroVoucher],
      function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ Voucher ${numeroVoucher} removido (${this.changes} registro(s))`);
          resolve();
        }
      }
    );
  });
}

// Opção 3: Ver estatísticas antes de limpar
function verEstatisticas() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        COUNT(*) as total_familias,
        COUNT(numero_voucher) as vouchers_vinculados,
        COUNT(data_entrega_kit) as kits_entregues
       FROM familias`,
      (err, stats) => {
        if (err) reject(err);
        else {
          console.log('\n📊 Estatísticas atuais:');
          console.log(`   Total de famílias: ${stats.total_familias}`);
          console.log(`   Vouchers vinculados: ${stats.vouchers_vinculados}`);
          console.log(`   Kits entregues: ${stats.kits_entregues}`);
          console.log('');
          resolve();
        }
      }
    );
  });
}

// Escolha qual operação executar
const operacao = process.argv[2];

(async () => {
  try {
    await verEstatisticas();

    if (operacao === 'limpar-tudo') {
      console.log('⚠️  Limpando TODAS as entregas...');
      await limparEntregas();
    } else if (operacao === 'limpar-voucher') {
      const numeroVoucher = process.argv[3];
      if (!numeroVoucher) {
        console.error('❌ Forneça o número do voucher');
        console.log('Uso: node scripts/limpar-dados.js limpar-voucher 1234');
        process.exit(1);
      }
      await limparVoucherEspecifico(numeroVoucher);
    } else {
      console.log('ℹ️  Comandos disponíveis:');
      console.log('');
      console.log('   Ver estatísticas:');
      console.log('   node scripts/limpar-dados.js');
      console.log('');
      console.log('   Limpar TODAS as entregas (mantém famílias):');
      console.log('   node scripts/limpar-dados.js limpar-tudo');
      console.log('');
      console.log('   Limpar voucher específico:');
      console.log('   node scripts/limpar-dados.js limpar-voucher 1234');
      console.log('');
    }

    await verEstatisticas();
    
    db.close(() => {
      console.log('✅ Concluído!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
})();
