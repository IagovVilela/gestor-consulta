# Guia de Setup Rápido

## ✅ Passos Concluídos

1. ✅ Dependências do backend instaladas
2. ✅ Dependências do frontend instaladas  
3. ✅ Prisma Client gerado
4. ✅ Estrutura de arquivos criada

## ⚠️ Próximos Passos Necessários

### 1. Iniciar o Docker Desktop

O Docker Desktop precisa estar rodando para iniciar o MySQL.

1. Abra o Docker Desktop no Windows
2. Aguarde até que esteja totalmente iniciado
3. Execute no terminal:

```bash
docker-compose up -d
```

### 2. Criar arquivo .env do backend

Crie o arquivo `backend/.env` com o seguinte conteúdo:

```env
DATABASE_URL="mysql://gestor_user:gestor_password@localhost:3306/gestor_consulta?schema=public"
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_DEST=./uploads
```

### 3. Executar Migrações do Banco

Após o MySQL estar rodando:

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Iniciar os Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Acessar o Sistema

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### 6. Criar Primeiro Usuário

Você pode criar o primeiro usuário via API:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"senha123\",\"name\":\"Administrador\",\"role\":\"ADMIN\"}"
```

Ou usar o Prisma Studio:

```bash
cd backend
npx prisma studio
```

## 🔍 Verificação

Para verificar se tudo está funcionando:

1. MySQL rodando: `docker ps` deve mostrar o container mysql
2. Backend: Acesse http://localhost:3001/api/auth/me (deve retornar erro de autenticação, mas significa que está rodando)
3. Frontend: Acesse http://localhost:3000 (deve mostrar a página inicial)

## 📝 Notas

- O Docker precisa estar rodando antes de executar as migrações
- Certifique-se de que as portas 3000 e 3001 estão livres
- O arquivo .env do backend é necessário para conectar ao banco




