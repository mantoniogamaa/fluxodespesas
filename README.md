# Fluxo Modular v7

Esta etapa deixa de depender do loader legado e passa a ter um **entrypoint modular real**.

## O que entrou

- `assets/js/main.js` como ponto de entrada da aplicação
- `assets/js/modules/app.js` com navegação, eventos, renderização e modais
- `assets/js/modules/constants.js` para categorias, páginas e política padrão
- `assets/js/modules/seed.js` com a base demo inicial
- `assets/js/modules/helpers.js` para formatação e utilitários de DOM
- `assets/js/modules/charts.js` para gráficos simples em canvas
- `assets/css/styles.css` extraído do HTML original, para deixar a estrutura realmente utilizável

## Ganho real

- `app.js` saiu da dependência planejada de scripts globais
- a aplicação passa a carregar por módulos (`type="module"`)
- o CSS deixou de faltar no pacote modular
- o fluxo de prestação agora gera despesas pendentes automaticamente ao enviar

## O que ainda falta

- quebrar `app.js` em `events/`, `renderers/` e `modals/`
- migrar as renderizações para componentes menores
- remover `window.FluxoApp`, que ficou apenas como apoio de inspeção
- conectar a camada de persistência com backend real no próximo ciclo


## v8 — corte do módulo central

Nesta versão, `assets/js/modules/app.js` virou apenas o orquestrador da aplicação.

Novos módulos:
- `context.js`: estado derivado e helpers de escopo
- `ui.js`: toasts, modais, sidebar, persistência e seed
- `renderers.js`: renderização das páginas e blocos de interface
- `actions.js`: regras de interação acionadas pela interface
- `events.js`: binding central de eventos do DOM

Objetivo:
- reduzir o tamanho do arquivo central
- facilitar a próxima etapa de testes por módulo
- preparar a troca gradual de funções globais por dependências explícitas


## Testes automatizados

Esta versão inclui uma suíte inicial com `node:test` cobrindo regras críticas de negócio:

- política de limite por categoria
- cadastro e bloqueio de colaborador
- criação de fluxo
- rejeição de despesa com estorno
- rascunho e envio de prestação

Para executar:

```bash
npm test
```

Sem instalar dependências externas: a suíte usa apenas o runner nativo do Node.js.


## v10 — camada de persistência abstrata + preparo para GitHub

Nesta versão, a persistência deixou de conversar direto com `localStorage` nas regras de negócio.

### Novos arquivos

- `assets/js/modules/repository.js`
- `assets/js/modules/adapters/local-storage-adapter.js`
- `assets/js/modules/adapters/memory-adapter.js`
- `assets/js/modules/adapters/supabase-adapter.stub.js`
- `.nojekyll`
- `404.html`

### O que mudou

- `state.js` e `business.js` passaram a usar `FluxoRepository`
- `storage.js` ficou apenas como compatibilidade com o adapter local
- a aplicação continua funcionando em armazenamento local, mas agora existe uma interface clara para trocar a persistência depois
- a suíte de testes ganhou validação da troca de adapter

### Teste local

```bash
npm test
python3 -m http.server 4173
```

Depois abra `http://localhost:4173`.

### Teste no GitHub Pages

1. Suba o conteúdo desta pasta para a raiz do seu repositório.
2. Em **Settings > Pages**, publique a branch principal a partir da pasta `/ (root)`.
3. Aguarde a publicação e acesse a URL gerada pelo GitHub.

Credenciais demo:

- Gestor: `demo.gestor@empresa` / `12345`
- Colaborador: `demo.colaborador@empresa` / `12345`
