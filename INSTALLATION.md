# Guia de Instalação - Sistema Gestor de Consultas Médicas

## Pré-requisitos

- Node.js 18+ instalado
- Docker e Docker Compose instalados
- npm ou yarn

## Passo a Passo

### 1. Clone o repositório

```bash
git clone <repository-url>
cd Gestor-Consulta
```

### 2. Configure o MySQL com Docker

```bash
docker-compose up -d
```

Isso iniciará o MySQL na porta 3306.

### 3. Configure o Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` baseado no `.env.example`:

```env
DATABASE_URL="mysql://gestor_user:gestor_password@localhost:3306/gestor_consulta?schema=public"
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Execute as migrações do Prisma:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Inicie o servidor backend:

```bash
npm run start:dev
```

O backend estará rodando em `http://localhost:3001`

### 4. Configure o Frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie o arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Gestor de Consultas
```

Inicie o servidor frontend:

```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

### 5. Criar Usuário Administrador

Para criar o primeiro usuário, você pode usar o endpoint de registro:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "senha123",
    "name": "Administrador",
    "role": "ADMIN"
  }'
```

Ou usar o Prisma Studio para criar manualmente:

```bash
cd backend
npx prisma studio
```

## Estrutura de Módulos

O sistema está organizado em módulos independentes:

- **auth**: Autenticação e autorização
- **dashboard**: Métricas e indicadores
- **agenda**: Gerenciamento de agendamentos
- **pacientes**: Cadastro de pacientes
- **prontuario**: Prontuários eletrônicos
- **consultas**: Gerenciamento de consultas
- **relatorios**: Relatórios e análises
- **notificacoes**: Sistema de notificações
- **configuracoes**: Configurações do sistema

## Perfis de Usuário

- **ADMIN**: Acesso completo ao sistema
- **MEDICO**: Pode atender consultas e criar prontuários
- **SECRETARIA**: Pode agendar e gerenciar pacientes

## Próximos Passos

1. Configure as variáveis de ambiente de produção
2. Implemente upload de arquivos para documentos
3. Configure notificações por e-mail/WhatsApp
4. Adicione testes automatizados
5. Configure CI/CD para deploy

## Troubleshooting

### Erro de conexão com MySQL

Verifique se o Docker está rodando:
```bash
docker ps
```

### Erro de migração Prisma

Certifique-se de que o MySQL está acessível e as credenciais estão corretas no `.env`.

### Erro CORS no frontend

Verifique se `FRONTEND_URL` no backend está configurado corretamente.




