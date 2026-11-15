import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, stringifyFrontmatter, composeFile, parseBlocks, blocksToMd, renderMarkdown, inlineHtml, slugify } from '../js/md.js';
import * as T from '../js/tree.js';
import { diffLines } from '../js/diff.js';

test('frontmatter: ida e volta', () => {
  const src = '---\ntitle: Introdução\nicon: file-text\ntoc: false\norder: 3\n---\n\nTexto\n';
  const { data, body } = parseFrontmatter(src);
  assert.deepEqual(data, { title: 'Introdução', icon: 'file-text', toc: false, order: 3 });
  assert.equal(body, 'Texto\n');
  assert.equal(composeFile(data, body), src);
});

test('frontmatter: valores com caracteres especiais ficam entre aspas', () => {
  const out = stringifyFrontmatter({ title: 'Rede: portas #1', x: 'true' });
  const { data } = parseFrontmatter(out + 'x');
  assert.equal(data.title, 'Rede: portas #1');
  assert.equal(data.x, 'true');
});

test('sem frontmatter', () => {
  const r = parseFrontmatter('# oi');
  assert.equal(r.hasFrontmatter, false);
  assert.equal(r.body, '# oi');
});

const SAMPLE = `Uma **Câmera IP** é uma câmera.
Segunda linha do parágrafo.

## Interface web

- item um
- item dois

1. primeiro
2. segundo

> citação aqui

:::tip Dica
Use cabo de rede.
:::

\`\`\`bash
ping 192.168.0.10
\`\`\`

![alt](assets/img/a.png)

| a | b |
|---|---|
| 1 | 2 |

---
`;

test('blocos: tipos reconhecidos', () => {
  const types = parseBlocks(SAMPLE).map((b) => b.type);
  assert.deepEqual(types, ['p', 'h2', 'ul', 'ol', 'quote', 'callout', 'code', 'image', 'raw', 'hr']);
});

test('blocos: serializar sem editar não muda o texto (diff estável)', () => {
  const out = blocksToMd(parseBlocks(SAMPLE));
  assert.equal(out, SAMPLE);
});

test('blocos: editar só um bloco altera só esse bloco', () => {
  const blocks = parseBlocks(SAMPLE);
  blocks[1].text = 'Interface'; blocks[1].dirty = true;
  const out = blocksToMd(blocks);
  assert.equal(out, SAMPLE.replace('## Interface web', '## Interface'));
});

test('blocos novos serializam corretamente', () => {
  const out = blocksToMd([
    { type: 'h2', text: 'T', dirty: true }, { type: 'ul', items: ['a', 'b'], dirty: true },
    { type: 'callout', kind: 'warning', title: '', text: 'cuidado', dirty: true },
    { type: 'code', lang: 'js', text: 'x()', dirty: true },
  ]);
  assert.equal(out, '## T\n\n- a\n- b\n\n:::warning\ncuidado\n:::\n\n```js\nx()\n```\n');
});

test('render: html seguro e toc', () => {
  const { html, toc } = renderMarkdown('## Olá <script>\n\n[x](javascript:alert(1)) e **b** e `c<d>`\n');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('<strong>b</strong>'));
  assert.ok(html.includes('<code>c&lt;d&gt;</code>'));
  assert.deepEqual(toc.map((t) => t.id), ['ola-script']);
});

test('render: tabela e callout', () => {
  const { html } = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n:::danger\nnão faça\n:::\n');
  assert.ok(html.includes('<table>') && html.includes('<td>1</td>'));
  assert.ok(html.includes('admon-danger'));
});

test('inline: escapes e imagens', () => {
  assert.equal(inlineHtml('a \\*b\\* c'), 'a *b* c');
  assert.ok(inlineHtml('![x](a.png)', (u) => 'base/' + u).includes('src="base/a.png"'));
});

test('slugify', () => assert.equal(slugify('Configurações de Rede!'), 'configuracoes-de-rede'));

const mk = () => T.normalize({ title: 'T', items: [
  { type: 'category', id: 'extra', label: 'Extra', slug: 'extra', items: [
    { type: 'page', id: 'a', label: 'A', path: 'extra/a' },
    { type: 'category', id: 'sub', label: 'Sub', slug: 'sub', items: [{ type: 'page', id: 'b', label: 'B', path: 'extra/sub/b' }] },
  ] },
  { type: 'page', id: 'home', label: 'Home', path: 'home' },
] });

test('tree: mover antes/depois/dentro', () => {
  const m = mk();
  assert.ok(T.move(m, 'home', 'a', 'before'));
  assert.deepEqual(m.items[0].items.map((n) => n.id), ['home', 'a', 'sub']);
  assert.ok(T.move(m, 'a', 'sub', 'inside'));
  assert.deepEqual(m.items[0].items.map((n) => n.id), ['home', 'sub']);
  assert.deepEqual(T.find(m, 'sub').node.items.map((n) => n.id), ['b', 'a']);
});

test('tree: não permite mover categoria para dentro de si', () => {
  const m = mk();
  assert.equal(T.move(m, 'extra', 'sub', 'inside'), false);
  assert.equal(T.move(m, 'extra', 'b', 'after'), false);
});

test('tree: criar página gera caminho único dentro da pasta da categoria', () => {
  const m = mk();
  const p = T.addPage(m, 'sub', 'Nova página', new Set(['extra/sub/nova-pagina']));
  assert.equal(p.path, 'extra/sub/nova-pagina-2');
  const q = T.addPage(m, null, 'Home');
  assert.equal(q.path, 'home-2');
});

test('tree: remover, mover por delta e validar', () => {
  const m = mk();
  assert.ok(T.moveBy(m, 'home', -1));
  assert.equal(m.items[0].id, 'home');
  assert.equal(T.remove(m, 'b').id, 'b');
  assert.deepEqual(T.validate(m, (p) => p !== 'home'), ['arquivo ausente: home']);
});

test('diff de linhas', () => {
  const d = diffLines('a\nb\nc', 'a\nB\nc\nd');
  assert.deepEqual(d.stats, { add: 2, del: 1 });
  assert.deepEqual(d.rows.map((r) => r.t), [' ', '-', '+', ' ', '+']);
});
