# 🎫 Sistema de Vouchers - CRAS/Bolsa Família

Sistema web para gerenciar a entrega de vouchers e kits de alimentação para famílias beneficiárias do Bolsa Família.

## 📋 Sobre o Sistema

Este sistema foi desenvolvido para facilitar o controle de entrega de benefícios (vouchers e kits de alimentação) por funcionários do CRAS/Prefeitura. O sistema garante que cada família receba apenas um voucher e um kit, com validação de segurança através do número do voucher físico.

### Fluxo de Trabalho

1. **Dia 15-16**: Entrega dos Vouchers
   - Buscar família por CPF, NIS ou Nome
   - Vincular número do voucher físico à família
   - Sistema valida unicidade do voucher

2. **Dia 19**: Entrega dos Kits
   - Beneficiário apresenta o voucher físico
   - Sistema valida o número do voucher
   - Registra entrega e gera recibo em PDF

## 🚀 Instalação

### Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM ou Yarn

### Passo a Passo

1. **Clone ou baixe o projeto**

```powershell
cd sistema-vouncher
```

2. **Instale as dependências do backend**

```powershell
cd backend
npm install
```

3. **Volte para a raiz do projeto**

```powershell
cd ..
```

## 📊 Importação de Dados

### Preparar a Planilha

Sua planilha (Excel ou CSV) deve conter as seguintes colunas:

- `COD_FAMILIAR` ou `COD FAMILIAR` - Código que agrupa a família
- `NOME` - Nome do responsável
- `CPF` - CPF (com ou sem formatação)
- `NIS` - Número de Identificação Social
- `ENDERECO` - Endereço completo
- `BAIRRO` - Bairro
- `TELEFONE1` ou `TELEFONE` - Telefone de contato

**Importante:** A coluna CEP será ignorada automaticamente.

### Executar a Importação

```powershell
cd backend
node ../scripts/importar.js "C:\caminho\para\sua\planilha.xlsx"
```

O script irá:
- Ler a planilha
- Agrupar por código familiar (evita duplicatas)
- Limpar formatação de CPF e NIS
- Importar apenas famílias novas
- Exibir relatório detalhado

## 👥 Criar Primeiro Usuário

Antes de usar o sistema, você precisa criar um usuário administrador:

1. **Inicie o servidor**

```powershell
cd backend
npm start
```

2. **Crie o usuário via API** (use Postman, Insomnia ou curl)

```http
POST http://localhost:3000/api/auth/criar-admin
Content-Type: application/json

{
  "nome": "Administrador CRAS",
  "login": "admin",
  "senha": "senha123"
}
```

**Ou use PowerShell:**

```powershell
$body = @{
    nome = "Administrador CRAS"
    login = "admin"
    senha = "senha123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/criar-admin" -Method POST -Body $body -ContentType "application/json"
```

## ▶️ Executar o Sistema

### Opção 1: Executar com Docker (Recomendado para Produção) 🐳

**Pré-requisito:** Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```powershell
# Construir e iniciar o container
docker-compose up -d

# Verificar se está rodando
docker-compose ps

# Ver logs
docker-compose logs -f

# Parar o sistema
docker-compose down
```

**Acesso padrão:** http://localhost:3000

#### Para usar porta 80 em produção (sem Nginx):

Edite `docker-compose.yml` e mude a linha:
```yaml
ports:
  - "80:3000"  # Em vez de "3000:3000"
```

Depois:
```powershell
docker-compose up -d
```

**Acesso:** http://localhost (ou IP do servidor)

#### Nginx (Opcional - para HTTPS e melhor performance)

Se precisar de HTTPS, descomente a seção `nginx` no `docker-compose.yml` e suba novamente.

**Vantagens Docker:**
- ✅ Dados persistem automaticamente (volumes)
- ✅ Fácil de fazer backup
- ✅ Fácil de migrar para outro servidor
- ✅ Isolamento completo do sistema
- ✅ Reinicia automaticamente se cair

### Opção 2: Executar Manualmente

```powershell
cd backend
npm start
```

### Acessar o Sistema

Abra o navegador e acesse: **http://localhost:3000**

- Faça login com as credenciais criadas
- Busque famílias por CPF, NIS ou Nome
- Vincule vouchers e entregue kits

## 📁 Estrutura do Projeto

```
sistema-vouncher/
├── backend/
│   ├── config/
│   │   └── database.js          # Configuração SQLite
│   ├── middleware/
│   │   └── auth.js              # Autenticação JWT
│   ├── routes/
│   │   ├── auth.js              # Rotas de login
│   │   ├── familias.js          # Rotas de famílias
│   │   └── import.js            # Importação via upload
│   ├── utils/
│   │   └── pdfGenerator.js      # Geração de recibos
│   ├── server.js                # Servidor Express
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css            # Estilos responsivos
│   ├── js/
│   │   ├── login.js             # Lógica de login
│   │   ├── busca.js             # Busca de famílias
│   │   └── acao.js              # Ações (voucher/kit)
│   ├── login.html               # Tela de login
│   ├── busca.html               # Tela de busca
│   └── acao.html                # Tela de ação
├── scripts/
│   └── importar.js              # Script de importação
├── pdfs/                        # PDFs gerados (criado automaticamente)
└── README.md
```

## 💾 Backup dos Dados

### Backup Manual

O banco de dados está no arquivo `backend/database.sqlite`. Para fazer backup:

```powershell
# Copiar arquivo do banco
Copy-Item backend\database.sqlite backup\database-$(Get-Date -Format 'yyyy-MM-dd').sqlite
```

### Backup com Docker

Os dados já estão persistidos em volumes. Para fazer backup completo:

```powershell
# Parar o container
docker-compose down

# Copiar o banco de dados
Copy-Item backend\database.sqlite backup\

# Reiniciar
docker-compose up -d
```

### Restaurar Backup

```powershell
# Parar o sistema
docker-compose down  # ou Ctrl+C se rodando manualmente

# Substituir o arquivo
Copy-Item backup\database-YYYY-MM-DD.sqlite backend\database.sqlite

# Reiniciar
docker-compose up -d  # ou npm start
```

## 🔒 Segurança

- **Autenticação JWT**: Token de 8 horas de validade
- **Validação de Voucher**: Número deve ser único e validado na entrega do kit
- **Senhas Criptografadas**: Usando bcrypt
- **Auditoria**: Registra qual usuário fez cada entrega
- **Dados Persistentes**: SQLite com arquivo em disco (não se perde ao reiniciar)

## 🛠️ Funcionalidades

### ✅ Implementadas

- [x] Login de funcionários
- [x] Busca de famílias por CPF, NIS ou Nome
- [x] Vinculação de voucher físico
- [x] Validação de voucher na entrega do kit
- [x] Geração automática de recibo em PDF
- [x] Importação de planilha Excel/CSV
- [x] Interface responsiva (Desktop e Mobile)
- [x] Controle de unicidade (1 voucher por família)
- [x] Auditoria de entregas

## 📱 Responsividade

O sistema é totalmente responsivo e pode ser usado em:
- 💻 Desktop
- 📱 Tablets
- 📱 Smartphones

## 🐛 Troubleshooting

### Erro ao iniciar o servidor

```
Error: Cannot find module 'express'
```

**Solução:** Execute `npm install` dentro da pasta `backend/`

### Banco de dados não criado

O banco SQLite (`database.sqlite`) é criado automaticamente na primeira execução dentro da pasta `backend/`

### Erro ao importar planilha

Verifique se:
- O caminho do arquivo está correto
- A planilha contém as colunas obrigatórias
- O arquivo não está aberto em outro programa

## 📄 Licença

Este projeto foi desenvolvido para uso interno do CRAS/Prefeitura.

## 👨‍💻 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de TI.

---

**Desenvolvido com ❤️ para o CRAS - Programa Bolsa Família**
