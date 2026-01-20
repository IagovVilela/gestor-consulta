# Hot Reload - Detecção Automática de Mudanças

## ✅ Configuração Atual

Os servidores **já estão configurados** para detectar mudanças automaticamente!

### Backend (NestJS)

- **Script**: `npm run start:dev`
- **Modo**: Watch mode ativado (`--watch`)
- **Detecta**: Mudanças em arquivos `.ts`, `.js`, `.json`
- **Ação**: Recompila e reinicia automaticamente

### Frontend (Next.js)

- **Script**: `npm run dev`
- **Modo**: Hot Module Replacement (HMR) nativo
- **Detecta**: Mudanças em componentes, páginas, estilos
- **Ação**: Atualiza o navegador automaticamente (sem perder estado)

## 🚀 Como Usar

1. **Inicie os servidores**:
   ```powershell
   .\start.ps1
   ```

2. **Faça suas alterações** nos arquivos:
   - Backend: Edite arquivos em `backend/src/`
   - Frontend: Edite arquivos em `frontend/src/`

3. **Salve o arquivo** (Ctrl+S)

4. **Aguarde alguns segundos**:
   - Backend: Você verá mensagens de recompilação na janela do backend
   - Frontend: O navegador atualizará automaticamente

## 📝 O Que é Detectado Automaticamente

### Backend
- ✅ Mudanças em controllers, services, DTOs
- ✅ Mudanças em módulos
- ✅ Mudanças em configurações
- ✅ Mudanças em schemas Prisma (mas precisa executar `prisma generate` manualmente)

### Frontend
- ✅ Mudanças em componentes React
- ✅ Mudanças em páginas
- ✅ Mudanças em estilos (CSS/Tailwind)
- ✅ Mudanças em hooks e utilitários
- ✅ Mudanças em stores (Zustand)

## ⚠️ Quando Precisa Reiniciar Manualmente

Você **NÃO precisa reiniciar** na maioria dos casos, mas pode ser necessário em:

1. **Mudanças no Prisma Schema**:
   ```bash
   cd backend
   npx prisma generate
   # Backend reinicia automaticamente depois
   ```

2. **Mudanças em variáveis de ambiente** (.env):
   - Precisa reiniciar manualmente

3. **Mudanças em configurações do Next.js** (next.config.js):
   - Precisa reiniciar o frontend

4. **Instalação de novas dependências**:
   ```bash
   npm install nova-dependencia
   # Reinicie o servidor
   ```

5. **Erros de compilação** que impedem o servidor de iniciar:
   - Corrija o erro e o servidor reiniciará automaticamente

## 🔍 Verificando se Está Funcionando

### Backend
Na janela do backend, você verá mensagens como:
```
[Nest] 12345  - 18/01/2026, 21:45:12   LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 18/01/2026, 21:45:13   LOG [InstanceLoader] AppModule dependencies initialized
```

Quando você salvar um arquivo, verá:
```
File change detected. Starting incremental compilation...
```

### Frontend
No navegador, você verá no console (F12):
```
[HMR] connected
[HMR] bundle rebuilding
[HMR] bundle rebuilt in XXXms
```

## 💡 Dicas

1. **Mantenha os servidores rodando** enquanto desenvolve
2. **Salve frequentemente** (Ctrl+S) para ver as mudanças
3. **Observe as janelas dos servidores** para ver logs de recompilação
4. **Use o console do navegador** (F12) para ver atualizações do HMR
5. **Se algo não atualizar**, tente:
   - Salvar o arquivo novamente
   - Recarregar a página (F5)
   - Verificar se há erros nas janelas dos servidores

## 🎯 Resumo

✅ **Hot reload já está ativo!**
✅ **Não precisa reiniciar para mudanças de código**
✅ **Apenas salve e aguarde alguns segundos**
✅ **Os servidores detectam e aplicam mudanças automaticamente**




