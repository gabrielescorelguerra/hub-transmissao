# Hub Transmissão — documentação editável pela interface

Site de documentação (estilo Docusaurus) **sem banco de dados e sem servidor**: o conteúdo são arquivos neste repositório e o site é estático. Você edita pelo navegador (editor visual) ou direto nos arquivos; cada publicação vira um commit.

## Como funciona

- `content/sidebar.json` — estrutura do menu (seções, ordem, ícones, cores).
- `content/**/*.md` — uma página por arquivo, com frontmatter (`title`, `sidebar_label`, `icon`, `icon_color`, `description`, `toc`, `draft`).
- `assets/img/` — imagens enviadas pelo editor.
- `index.html` + `js/` + `css/` — o site e o editor (JavaScript puro, sem build).

- `content/checklist.json` — checklist do culto (itens podem ter link para uma página de tutorial).
- `content/mensagens.json` — mensagens da transmissão (cada uma com botão **Copiar**).

Site: `#/docs/<caminho>` · `#/checklist` · `#/mensagens` · Editor: `#/editor` (pede login).

## Hospedar (única coisa necessária)

**GitHub Pages:** Settings → Pages → *Deploy from a branch* → `main` / `(root)`. O site fica em `https://gabrielescorelguerra.github.io/hub-transmissao/`.
Netlify, Vercel e Cloudflare Pages também servem: pasta raiz, sem comando de build.

Cada publicação feita no editor é um commit em `main`; o host atualiza sozinho.

## Login do editor (senha fixa)

O editor pede uma **senha**. Por trás, as alterações são commits no GitHub, que precisam de um token; o token fica guardado **cifrado com a senha** no arquivo `auth.json` do repositório (AES-GCM + PBKDF2). Sem a senha, é só texto cifrado.

**Primeiro acesso (uma vez):**
1. <https://github.com/settings/personal-access-tokens/new> (Fine-grained token).
2. *Repository access* → **Only select repositories** → `gabrielescorelguerra/hub-transmissao`.
3. *Permissions* → **Contents: Read and write**.
4. Abra `#/editor`, clique em **Primeiro acesso / trocar senha**, cole o token e escolha a senha. O site grava o `auth.json` no repositório.

Depois disso, qualquer pessoa com a senha entra só digitando a senha. Para trocar a senha (ou renovar um token expirado), repita o primeiro acesso.

**Atenção:** a senha é simples de propósito, mas o repositório é público no GitHub Pages, então alguém com o `auth.json` pode tentar adivinhar a senha offline. Use uma senha longa e o token restrito a este repositório; se quiser mais segurança depois, dá para trocar por um login de verdade.

## Editando

- **Visual:** blocos (`/` para inserir), negrito/itálico/código/link, imagens (enviar, colar ou arrastar), avisos (`:::tip`), listas, citações.
- **Cores:** cada página e seção (e cada seção da checklist/mensagens) pode ter uma cor, que pinta títulos e ícones; páginas herdam a cor da seção.
- **Sidebar:** arraste para reordenar/mover, duplo clique renomeia, clique no ícone para trocar, `Alt+↑/↓` move pelo teclado.
- **Código:** acesso a todos os arquivos do repositório; **Dividido** mostra código e visual juntos.
- **Publicar:** lista as alterações com diff, valida o menu, e publica direto em `main` ou abre um Pull Request. Rascunhos ficam salvos no navegador até publicar.

Tabelas, HTML e listas aninhadas aparecem como "bloco avançado" (markdown) e são preservados exatamente como estão.

## Desenvolvimento

```bash
python3 -m http.server 8000   # abre http://localhost:8000
node --test tests/core.test.mjs
```

## Limitações

- Não usa o Docusaurus em si (sem MDX/React/plugins); o formato dos arquivos é compatível (markdown com frontmatter e `:::tip`).
- Envio de SVG e imagens muito grandes (> ~5 MB) não é tratado.
- Dois editores simultâneos: o editor detecta mudança no GitHub e avisa antes de sobrescrever.
