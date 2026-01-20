# Sistema de Gerenciamento de Consultas Médicas

Sistema web completo e modular para gerenciamento de consultas médicas, desenvolvido com Next.js (frontend), NestJS (backend), MySQL e Prisma.

## 🚀 Tecnologias

### Frontend
- Next.js 14+ (App Router)
- React + TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Zustand
- Axios
- Recharts

### Backend
- NestJS
- TypeScript
- Prisma ORM
- MySQL
- JWT Authentication
- class-validator

## 📋 Pré-requisitos

- Node.js 18+ 
- Docker e Docker Compose
- npm ou yarn

## 🔧 Instalação Rápida

Consulte o arquivo [INSTALLATION.md](./INSTALLATION.md) para instruções detalhadas.

### Resumo

1. Clone o repositório
2. Inicie o MySQL: `docker-compose up -d`
3. Configure o backend: `cd backend && npm install && npx prisma migrate dev`
4. Configure o frontend: `cd frontend && npm install`
5. Inicie os servidores

## 📁 Estrutura do Projeto

```
Gestor-Consulta/
├── frontend/          # Next.js App
│   ├── src/
│   │   ├── app/       # Páginas e rotas
│   │   ├── components/# Componentes compartilhados
│   │   ├── lib/       # Utilitários e configurações
│   │   └── modules/   # Módulos do sistema
├── backend/           # NestJS API
│   ├── src/
│   │   ├── modules/   # Módulos NestJS
│   │   ├── common/    # Guards, decorators, filters
│   │   └── config/    # Configurações
│   └── prisma/        # Schema e migrações
├── docker-compose.yml # MySQL
└── README.md
```

## 🧩 Módulos Implementados

- ✅ **Autenticação**: Login, registro, JWT, controle de acesso
- ✅ **Dashboard**: Métricas, gráficos e indicadores
- ✅ **Agenda**: CRUD de agendamentos, validação de conflitos
- ✅ **Pacientes**: Cadastro completo, busca, histórico
- ✅ **Prontuário**: Registro por consulta, evoluções, prescrições
- ✅ **Consultas**: Gerenciamento de atendimentos
- ✅ **Relatórios**: Dashboards e análises
- ✅ **Notificações**: Sistema de notificações
- ✅ **Configurações**: Gerenciamento de especialidades e usuários

## 🔐 Perfis de Usuário

- **ADMIN**: Gerenciamento completo do sistema
- **MEDICO**: Atendimento e prontuários
- **SECRETARIA**: Agendamento e cadastro

## 📡 API Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Perfil do usuário

### Dashboard
- `GET /api/dashboard/metrics` - Métricas gerais
- `GET /api/dashboard/consultas-hoje` - Consultas do dia

### Agenda
- `GET /api/agenda` - Listar consultas
- `POST /api/agenda` - Criar agendamento
- `PUT /api/agenda/:id` - Atualizar agendamento

### Pacientes
- `GET /api/pacientes` - Listar pacientes
- `POST /api/pacientes` - Cadastrar paciente
- `GET /api/pacientes/:id` - Detalhes do paciente

## 🎨 Features

- ✅ Arquitetura modular
- ✅ Autenticação JWT
- ✅ Controle de acesso por perfil
- ✅ Dashboard com gráficos
- ✅ Interface responsiva
- ✅ Dark mode (preparado)
- ✅ Validação de dados
- ✅ Tratamento de erros

## 📝 Próximos Passos

- [ ] Upload de documentos
- [ ] Notificações por e-mail/WhatsApp
- [ ] Calendário interativo com drag & drop
- [ ] Exportação de relatórios PDF/Excel
- [ ] Testes automatizados
- [ ] Documentação Swagger/OpenAPI

## 📝 Licença

Este projeto é privado e confidencial.
