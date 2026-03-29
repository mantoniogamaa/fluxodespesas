# Fluxo — versão flat para GitHub Pages

Esta versão foi achatada para facilitar upload manual no GitHub quando o navegador ou fluxo de envio não sobe pastas corretamente.

## O que mudou
- todos os arquivos de execução ficaram na raiz
- `index.html` aponta para `./styles.css` e `./main.js`
- imports ES Modules foram ajustados para arquivos soltos
- inclui `.nojekyll`, `404.html` e `favicon.svg`

## Estrutura esperada no repositório
Todos estes arquivos devem ficar na raiz do repositório:
- `index.html`
- `styles.css`
- `main.js`
- `app.js`
- `state.js`
- `business.js`
- `repository.js`
- `local-storage-adapter.js`
- demais módulos `.js`
- `.nojekyll`
- `404.html`
- `favicon.svg`

## Publicação no GitHub Pages
1. Apague os arquivos antigos do repositório ou mova para outra branch/pasta.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. Em **Settings > Pages**, selecione a branch principal e a pasta **/(root)**.
4. Aguarde a publicação e faça um `Ctrl + F5`.

## Teste local
Abra via servidor local, não por `file://`.

```bash
python3 -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Credenciais demo
- Gestor: `demo.gestor@empresa` / `12345`
- Colaborador: `demo.colaborador@empresa` / `12345`
