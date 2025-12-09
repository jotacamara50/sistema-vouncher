# 🚀 Deploy em Produção com Domínio

## 📋 Pré-requisitos

1. **Servidor Linux** (Ubuntu 20.04+ ou Debian 11+)
2. **Domínio configurado** apontando para o IP do servidor
3. **Portas abertas**: 80 (HTTP) e 443 (HTTPS)
4. **Docker e Docker Compose instalados**

---

## ⚙️ Passo a Passo

### 1️⃣ Configurar o Domínio

✅ **Domínio já configurado:** `esperancanamesailheus.com`

O arquivo `nginx.conf` já está configurado com o domínio correto. Não precisa editar!

Certificados SSL serão gerados para:
- `esperancanamesailheus.com`
- `www.esperancanamesailheus.com`

### 2️⃣ Obter Certificado SSL (HTTPS)

**IMPORTANTE:** Faça isso **no servidor de produção** (não localmente).

```bash
# Criar diretórios para certificados
mkdir -p certbot/conf certbot/www

# Subir apenas Nginx temporariamente (SEM SSL)
docker-compose up -d nginx

# Gerar certificado SSL
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email contato@esperancanamesailheus.com \
  --agree-tos \
  --no-eff-email \
  -d esperancanamesailheus.com \
  -d www.esperancanamesailheus.com

# Reiniciar com SSL ativado
docker-compose down
docker-compose up -d
```

### 3️⃣ Subir o Sistema Completo

```bash
# Subir todos os containers (backend + nginx + certbot)
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 4️⃣ Testar o Sistema

Acesse: **https://esperancanamesailheus.com**

Você deve ver a tela de login com a logo.

---

## 🔒 Segurança Adicional

### Trocar SECRET_KEY do JWT

**MUITO IMPORTANTE:** Antes de ir para produção, gere uma chave secreta forte:

```bash
# Gerar chave aleatória
openssl rand -base64 32
```

Edite `backend/middleware/auth.js` e substitua:

```javascript
const SECRET_KEY = 'sua_chave_gerada_aqui_com_openssl';
```

---

## 🔄 Renovação Automática de SSL

O container `certbot` renova automaticamente o certificado a cada 12 horas. Não precisa fazer nada!

Para forçar renovação manual:

```bash
docker-compose run --rm certbot renew
docker-compose exec nginx nginx -s reload
```

---

## 📊 Monitoramento

Ver logs em tempo real:

```bash
# Todos os containers
docker-compose logs -f

# Apenas backend
docker-compose logs -f sistema-voucher

# Apenas nginx
docker-compose logs -f nginx
```

---

## 🛑 Parar o Sistema

```bash
# Parar containers (mantém dados)
docker-compose down

# Parar E remover volumes (CUIDADO: perde dados!)
docker-compose down -v
```

---

## 📦 Backup do Banco de Dados

```bash
# Backup
cp backend/database.sqlite backup/database-$(date +%Y%m%d).sqlite

# Restaurar
cp backup/database-20250109.sqlite backend/database.sqlite
docker-compose restart sistema-voucher
```

---

## 🐛 Troubleshooting

### Erro: "502 Bad Gateway"
```bash
# Verificar se backend está rodando
docker-compose logs sistema-voucher
docker-compose restart sistema-voucher
```

### Erro: "Connection refused"
```bash
# Verificar se portas estão abertas no firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### SSL não funciona
```bash
# Verificar certificados
docker-compose exec nginx ls -la /etc/letsencrypt/live/

# Ver logs do certbot
docker-compose logs certbot
```

---

## ✅ Checklist Final

- [ ] Domínio esperancanamesailheus.com apontando para o servidor
- [ ] Portas 80 e 443 abertas no firewall
- [ ] ✅ nginx.conf com domínio correto (esperancanamesailheus.com)
- [ ] Certificado SSL gerado pelo Certbot
- [ ] SECRET_KEY trocado em `backend/middleware/auth.js`
- [ ] Usuário criado (CPF: 12345678900, senha: 123456)
- [ ] Dados importados (21.473 famílias)
- [ ] Backup configurado
- [ ] Sistema testado em https://esperancanamesailheus.com

---

## 🎯 Comandos Rápidos

```bash
# Subir produção
docker-compose up -d

# Ver status
docker-compose ps

# Logs
docker-compose logs -f

# Parar
docker-compose down

# Backup banco
cp backend/database.sqlite backup/db-$(date +%Y%m%d).sqlite

# Limpar dados de teste
sqlite3 backend/database.sqlite "UPDATE familias SET numero_voucher = NULL, data_entrega_voucher = NULL, data_entrega_kit = NULL, usuario_entregou_id = NULL;"
```
