# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Servir o app localmente
python3 -m http.server 4173
# acesse http://localhost:4173

# Rodar os testes (Node built-in test runner)
node --test
# ou
npm test

# Rodar um único arquivo de teste
node --test business.test.mjs
```

Não há bundler, transpilador ou etapa de build. Qualquer mudança nos arquivos `.js`, `.html` ou `.css` é imediatamente refletida ao recarregar o browser.

## Arquitetura

### Stack
- **Frontend puro**: HTML + CSS + ES Modules nativos (sem bundler, sem framework)
- **Backend**: Supabase (Auth + Postgres)
- **Deploy**: GitHub Pages — branch `main`, raiz `/`
- **URL produção**: `https://mantoniogamaa.github.io/fluxodespesas/`

### Inicialização (`app.js → initApp`)
O ponto de entrada real é `main.js` (carregado pelo `index.html` como `type="module"`), que chama `initApp()` de `app.js`. A inicialização segue esta ordem:

1. `createAppContext()` — cria os accessors `auth()`, `data()`, `ui()`, `currentUser()`, `isGestor()`
2. `createUi()` — cria helpers de UI: modal, toast, sidebar, seed, persist
3. `createRenderers()` — cria todas as funções de renderização de páginas
4. `createActions()` — cria todos os handlers de ação do usuário
5. `bindEvents()` — conecta eventos DOM às actions via `data-action` attributes
6. Bootstrap: carrega estado do Supabase (se conectado) ou do localStorage + seed de demo

### Estado global (`state.js`)
`FluxoState` é um observer reativo com três seções:
- `state.auth` — `{ currentRole, currentUser }`
- `state.data` — dados de negócio: `colaboradores`, `verbas` (fluxos), `despesas`, `prestacoes`, `politica`, `logAcoes`, `_centrosCusto`, `_politicas`, `_usuarios`
- `state.ui` — estado efêmero de UI: `catSelecionada`, `refeicaoTipo`, `fotoPrestUrl`, `verbaSelecionadaId`, `itensPrest`

**Nunca acesse o estado diretamente** — use os accessors `data()`, `ui()`, `auth()` passados como closures para cada módulo.

### Persistência (`repository.js`)
`FluxoRepository` é um adapter pattern com duas camadas simultâneas:
- **Local**: `localStorage` via `local-storage-adapter.js` (sempre ativo)
- **Cloud**: Supabase via `supabase-cloud-adapter.js` (ativo quando `isSupabaseEnabled()` retorna `true`)

Toda escrita passa por `persist()` (de `ui.js`), que chama `FluxoRepository.saveState()`. A carga usa `FluxoRepository.loadState()` no bootstrap.

### Renderização
Não há reatividade automática — toda mudança de estado chama `renderAll()` ou uma função específica como `renderPrestacao()`. Cada função de render lê diretamente de `data()` e escreve via `innerHTML` no container da página.

O roteamento é por `App.currentPage` (string), que aciona `renderCurrentPage()` no switch de `renderers.js`.

### Eventos DOM
Todos os eventos de clique usam **delegação**: um único listener no `document` lê `data-action` do elemento clicado e despacha para a função correspondente. Inputs com `data-input="X"` disparam `X()` no evento `input`. Selects com `data-change="X"` disparam `X()` no evento `change`.

### Lógica de negócio (`business.js`)
Dividida em serviços internos retornados como objeto:
- `AuthService` — login/logout (local e Supabase)
- `PolicyService` — `checkLimit()` verifica se uma despesa excede a política; alimentação tem sub-limites por tipo de refeição (almoco/jantar/outros)
- `ColaboradorService` — CRUD de colaboradores
- `FluxoService` — criação de fluxos com numeração automática `FLX-{ano}-{seq}`
- `DespesaService` — `submitSingle()` lança uma despesa individual para Pendente; `approve()` / `reject()` com estorno de saldo no fluxo
- `PrestacaoService` — legado (mantido para compatibilidade)

### Supabase (`supabase-service.js`)
Funções de leitura/escrita diretas na API do Supabase. O estado do app vive em uma linha JSONB em `workspace_state.payload` (modelo de homologação — não ideal para produção com RLS fina por linha).

Credenciais ficam em `config.js` (não versionado em produção — preencher manualmente).

## Papéis de usuário

| Role | Acesso |
|---|---|
| `gestor` / `admin` | Tudo: fluxos, aprovações, relatórios, colaboradores, políticas, CC |
| `financeiro` | Relatórios, comparativo, log (somente leitura) |
| `colaborador` | Dashboard, extrato, histórico e lançamento de despesas |

`isGestor()` retorna `true` para `gestor` e `admin`. O `scopeFilter(colabId)` isola dados do colaborador logado quando não é gestor.

## Fluxo de negócio principal

1. **Gestor cria Fluxo** (`FluxoService.create`) → crédito atribuído ao colaborador, numerado como `FLX-YYYY-NNN`, fluxo fica `status: 'ativa'`
2. **Colaborador lança despesa** (`DespesaService.submitSingle`) → foto OCR, preenche dados, seleciona CC e categoria → despesa vai para `status: 'Pendente'`, `fluxo.usado` é reservado
3. **Gestor aprova ou rejeita** na página Aprovações → aprovação confirma, rejeição faz estorno em `fluxo.usado`

Fluxos **nunca são fechados automaticamente** — permanecem `ativa` para novos lançamentos.

## Adicionar uma nova página

1. Adicionar entrada em `PAGE_META` em `constants.js`
2. Adicionar `<div class="page" id="page-X">` em `index.html`
3. Adicionar item de nav em `index.html` com `data-page="X"` e controle de visibilidade por papel em `renderChrome()` em `renderers.js`
4. Adicionar `case 'X': renderX(); break;` em `renderCurrentPage()` em `renderers.js`
5. Escrever `function renderX()` dentro de `createRenderers()`

## Adicionar uma nova action

1. Escrever a função dentro de `createActions()` em `actions.js`
2. Exportá-la no objeto retornado no final de `actions.js`
3. Passá-la para `bindEvents()` em `app.js`
4. Adicionar `case 'nome-action':` em `bindEvents()` em `events.js`
5. Adicionar `data-action="nome-action"` no elemento HTML

## Testes

O arquivo `business.test.mjs` testa a lógica de negócio isolada usando `memory-adapter.js` (sem localStorage, sem DOM). Para rodar no Windows sem Python: abrir `index.html` diretamente pelo File Explorer não funciona por CORS nos ES Modules — use o servidor Python ou Live Server do VS Code.
