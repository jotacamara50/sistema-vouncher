const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conectado ao banco de dados SQLite');
  }
});

// Criar tabelas
db.serialize(() => {
  // Tabela de famílias (dados gerais da família)
  db.run(`
    CREATE TABLE IF NOT EXISTS familias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cod_familiar VARCHAR(50) UNIQUE NOT NULL,
      nome_responsavel VARCHAR(255) NOT NULL,
      endereco TEXT,
      bairro VARCHAR(100),
      telefone VARCHAR(20),
      renda_media DECIMAL(10,2),
      numero_voucher INTEGER UNIQUE,
      data_entrega_voucher DATETIME,
      data_entrega_kit DATETIME,
      usuario_entregou_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de membros (cada pessoa da família)
  db.run(`
    CREATE TABLE IF NOT EXISTS membros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      familia_id INTEGER NOT NULL,
      cod_familiar VARCHAR(50) NOT NULL,
      nome VARCHAR(255) NOT NULL,
      cpf VARCHAR(14) NOT NULL,
      nis VARCHAR(20) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE
    )
  `);

  // Índices para busca rápida
  db.run(`CREATE INDEX IF NOT EXISTS idx_cod_familiar ON familias(cod_familiar)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_numero_voucher ON familias(numero_voucher)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_membros_familia_id ON membros(familia_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_membros_cod_familiar ON membros(cod_familiar)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_membros_cpf ON membros(cpf)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_membros_nis ON membros(nis)`);

  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome VARCHAR(255) NOT NULL,
      login VARCHAR(50) UNIQUE NOT NULL,
      senha VARCHAR(255) NOT NULL,
      unidade VARCHAR(100) NOT NULL,
      tipo VARCHAR(20) DEFAULT 'atendente' CHECK(tipo IN ('atendente', 'fiscal')),
      ativo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Tabelas criadas/verificadas com sucesso');
});

module.exports = db;
