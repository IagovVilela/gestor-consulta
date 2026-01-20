# 📋 Fluxo Completo: Criação e Edição de Clínica com Gerente

## 🎯 Visão Geral

Quando você cria ou edita uma clínica e preenche os dados do gerente, o sistema automaticamente cria/atualiza um **perfil de usuário** para o gerente. Este gerente se torna o **dono (owner)** da clínica e pode gerenciar usuários independentemente.

---

## 🔵 FLUXO 1: CRIAR NOVA CLÍNICA COM GERENTE

### Passo a Passo:

1. **ADMIN preenche o formulário:**
   - Dados da Clínica: nome, CNPJ, telefone, email, endereço, logo, cores
   - Dados do Gerente: nome, email, senha

2. **Backend processa (em uma única transação):**

   ```
   ┌─────────────────────────────────────────────────┐
   │  INÍCIO DA TRANSAÇÃO (Tudo ou Nada)            │
   └─────────────────────────────────────────────────┘
   
   ✅ PASSO 1: Criar a Clínica
      - Cria registro na tabela `clinicas`
      - Ainda SEM ownerId (será atualizado depois)
   
   ✅ PASSO 2: Criar/Reativar Usuário Gerente
      - Verifica se email já existe
      - Se existe e está INATIVO → Reativa o usuário
      - Se NÃO existe → Cria novo usuário
      - Role: 'MEDICO' (permite gerenciar usuários)
      - clinicaId: vinculado à clínica criada
   
   ✅ PASSO 3: Vincular Gerente como Owner
      - Atualiza clínica.ownerId = gerente.id
      - Agora a clínica tem um dono oficial
   
   ┌─────────────────────────────────────────────────┐
   │  FIM DA TRANSAÇÃO                               │
   └─────────────────────────────────────────────────┘
   ```

3. **Resultado no Banco de Dados:**

   ```sql
   -- Tabela: clinicas
   {
     id: "uuid-clinica",
     nome: "Clínica Teste",
     ownerId: "uuid-gerente",  ← Vinculado ao gerente
     ...
   }
   
   -- Tabela: users
   {
     id: "uuid-gerente",
     name: "Dr. João Silva",
     email: "joao@clinicateste.com",
     password: "hash-da-senha",
     role: "MEDICO",           ← Permite gerenciar usuários
     clinicaId: "uuid-clinica", ← Vinculado à clínica
     active: true
   }
   ```

4. **O que o Gerente pode fazer:**
   - ✅ Fazer login com email/senha fornecidos
   - ✅ Ver apenas sua clínica
   - ✅ Criar/editar/excluir médicos da sua clínica
   - ✅ Criar/editar/excluir secretárias da sua clínica
   - ✅ Gerenciar pacientes da sua clínica
   - ✅ Gerenciar consultas da sua clínica
   - ❌ NÃO pode criar outras clínicas
   - ❌ NÃO pode ver usuários de outras clínicas
   - ❌ NÃO pode promover usuários para ADMIN

---

## 🟢 FLUXO 2: EDITAR CLÍNICA E GERENTE

### Passo a Passo:

1. **ADMIN clica em "Editar" na clínica:**
   - Sistema busca clínica completa (incluindo dados do owner)
   - Formulário é preenchido com dados atuais

2. **ADMIN pode alterar:**
   - Dados da Clínica: nome, CNPJ, telefone, etc.
   - Dados do Gerente: nome, email, senha (opcional)

3. **Backend processa (em uma única transação):**

   ```
   ┌─────────────────────────────────────────────────┐
   │  INÍCIO DA TRANSAÇÃO                            │
   └─────────────────────────────────────────────────┘
   
   ✅ PASSO 1: Validar CNPJ (se alterado)
      - Verifica se não está em uso por outra clínica
   
   ✅ PASSO 2: Atualizar Dados da Clínica
      - Atualiza campos da clínica
   
   ✅ PASSO 3: Atualizar Dados do Gerente (se fornecidos)
      - Se gerenteName → atualiza name do usuário
      - Se gerenteEmail → valida e atualiza email
      - Se gerentePassword → hash e atualiza senha
      - Valida que email não está em uso por outro usuário
   
   ✅ PASSO 4: Trocar Gerente (se gerenteId fornecido)
      - Valida que novo gerente é MEDICO
      - Atualiza clínica.ownerId = novo gerente
      - Vincula novo gerente à clínica
      - Remove vínculo do gerente antigo
   
   ┌─────────────────────────────────────────────────┐
   │  FIM DA TRANSAÇÃO                               │
   └─────────────────────────────────────────────────┘
   ```

4. **Cenários de Edição:**

   **Cenário A: Apenas atualizar dados do gerente atual**
   ```
   - Nome: "Dr. João Silva" → "Dr. João Silva Santos"
   - Email: "joao@teste.com" → "joao.silva@teste.com"
   - Senha: (deixar em branco = não altera)
   ```
   → Apenas atualiza o usuário gerente existente

   **Cenário B: Trocar o gerente**
   ```
   - Selecionar outro médico como gerente
   ```
   → Remove ownerId do gerente antigo
   → Define novo ownerId na clínica
   → Novo gerente passa a ter permissões

   **Cenário C: Atualizar senha**
   ```
   - Preencher campo "Nova Senha"
   ```
   → Hash da senha é atualizado
   → Gerente pode fazer login com nova senha

---

## 🔑 Conceitos Importantes

### 1. **OwnerId vs ClinicaId**

```typescript
// Na tabela clinicas
ownerId: "uuid-do-gerente"  // Quem é o DONO da clínica

// Na tabela users
clinicaId: "uuid-da-clinica"  // A qual clínica o usuário pertence
```

- **ownerId**: Define quem é o gerente/dono da clínica
- **clinicaId**: Define a qual clínica o usuário pertence
- Um gerente tem `clinicaId` E a clínica tem `ownerId` apontando para ele

### 2. **Role MEDICO para Gerente**

O gerente tem role `MEDICO` porque:
- ✅ Pode gerenciar usuários (médicos e secretárias)
- ✅ Tem acesso completo à clínica
- ✅ Pode criar profissionais
- ✅ Pode criar secretárias

### 3. **Transações Atômicas**

Todas as operações são feitas em **transações**:
- ✅ Se algo falhar, tudo é revertido
- ✅ Garante consistência dos dados
- ✅ Evita clínicas sem gerente ou gerentes sem clínica

### 4. **Validações**

**Ao Criar:**
- ✅ Email do gerente não pode estar em uso (ativo)
- ✅ CNPJ não pode estar em uso (ativo)
- ✅ Senha mínima de 6 caracteres

**Ao Editar:**
- ✅ Email não pode estar em uso por OUTRO usuário
- ✅ Novo gerente deve ser MEDICO
- ✅ CNPJ não pode estar em uso por OUTRA clínica

---

## 📊 Exemplo Prático

### Criando uma Clínica:

```
ADMIN preenche:
├─ Clínica: "Clínica Saúde Total"
├─ CNPJ: "12.345.678/0001-90"
├─ Gerente Nome: "Dr. Carlos Mendes"
├─ Gerente Email: "carlos@saudetotal.com"
└─ Gerente Senha: "senha123"

↓ Sistema cria:

CLINICA:
├─ id: "abc-123"
├─ nome: "Clínica Saúde Total"
├─ ownerId: "xyz-789"  ← Vinculado ao gerente
└─ ...

USUÁRIO GERENTE:
├─ id: "xyz-789"
├─ name: "Dr. Carlos Mendes"
├─ email: "carlos@saudetotal.com"
├─ password: "hash..."
├─ role: "MEDICO"
├─ clinicaId: "abc-123"  ← Vinculado à clínica
└─ active: true
```

### Editando a Clínica:

```
ADMIN altera:
├─ Nome Clínica: "Clínica Saúde Total Premium"
├─ Gerente Nome: "Dr. Carlos Mendes Silva"
├─ Gerente Email: "carlos.silva@saudetotal.com"
└─ Nova Senha: "novaSenha456"

↓ Sistema atualiza:

CLINICA:
├─ nome: "Clínica Saúde Total Premium"  ← Atualizado
└─ ownerId: "xyz-789"  ← Mesmo gerente

USUÁRIO GERENTE:
├─ name: "Dr. Carlos Mendes Silva"  ← Atualizado
├─ email: "carlos.silva@saudetotal.com"  ← Atualizado
└─ password: "novo-hash..."  ← Atualizado
```

---

## 🎯 Resumo

1. **Ao criar clínica**: Sistema cria automaticamente um usuário MEDICO que se torna o gerente
2. **Ao editar clínica**: Sistema permite atualizar dados do gerente ou trocar o gerente
3. **Gerente é independente**: Pode gerenciar sua clínica sem intervenção do ADMIN
4. **Tudo é atômico**: Se algo falhar, nada é salvo (transação)
5. **Validações garantem**: Email único, CNPJ único, gerente deve ser MEDICO

---

## ❓ Perguntas Frequentes

**P: O gerente precisa ser criado manualmente antes?**
R: Não! O sistema cria automaticamente quando você cria a clínica.

**P: Posso ter uma clínica sem gerente?**
R: Não, ao criar uma clínica você DEVE fornecer dados do gerente.

**P: Posso trocar o gerente depois?**
R: Sim! Ao editar a clínica, você pode selecionar outro médico como gerente.

**P: O que acontece se eu alterar o email do gerente?**
R: O gerente precisará usar o novo email para fazer login.

**P: E se eu alterar a senha?**
R: O gerente precisará usar a nova senha para fazer login.

**P: O gerente pode criar outros gerentes?**
R: Não, apenas ADMIN pode criar/editar clínicas e gerentes.

