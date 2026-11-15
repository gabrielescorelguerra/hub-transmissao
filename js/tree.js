// Operações puras sobre o manifesto (content/sidebar.json). Sem DOM, testável em Node.
import { slugify } from './md.js';

/*
manifest = { title, items: [ node ] }
node categoria: { type:'category', id, label, icon, iconColor?, slug, collapsed?, items:[] }
node página:    { type:'page', id, label, icon, iconColor?, path, hidden?, draft? }
*/

export const emptyManifest = (title = 'Documentação') => ({ title, items: [] });

export function walk(items, fn, parent = null, depth = 0) {
  for (const n of items) {
    if (fn(n, parent, depth) === false) return false;
    if (n.type === 'category' && walk(n.items || [], fn, n, depth + 1) === false) return false;
  }
  return true;
}

export function find(m, id) {
  let r = null;
  walk(m.items, (n, parent) => { if (n.id === id) { r = { node: n, parent, list: parent ? parent.items : m.items }; return false; } });
  return r;
}

export const findByPath = (m, path) => { let r = null; walk(m.items, (n) => { if (n.type === 'page' && n.path === path) { r = n; return false; } }); return r; };
export const pages = (m) => { const o = []; walk(m.items, (n) => { if (n.type === 'page') o.push(n); }); return o; };
export const allIds = (m) => { const s = new Set(); walk(m.items, (n) => s.add(n.id)); return s; };
export const allPaths = (m) => new Set(pages(m).map((p) => p.path));

/** Lista de ancestrais (categorias) de um nó, do mais externo ao mais interno. */
export function ancestors(m, id) {
  const chain = [];
  const rec = (items, acc) => {
    for (const n of items) {
      if (n.id === id) { chain.push(...acc); return true; }
      if (n.type === 'category' && rec(n.items || [], [...acc, n])) return true;
    }
    return false;
  };
  rec(m.items, []);
  return chain;
}

const uniq = (base, taken) => { let s = base, i = 2; while (taken.has(s)) s = `${base}-${i++}`; return s; };

export function folderOf(m, parentId) {
  if (!parentId) return '';
  const chain = [...ancestors(m, parentId), find(m, parentId)?.node].filter(Boolean);
  return chain.map((c) => c.slug || slugify(c.label)).join('/');
}

export function newId(m, label) { return uniq(slugify(label), allIds(m)); }

export function addCategory(m, parentId, label, extra = {}) {
  const list = parentId ? find(m, parentId).node.items : m.items;
  const siblingsSlugs = new Set(list.filter((n) => n.type === 'category').map((n) => n.slug));
  const node = { type: 'category', id: newId(m, label), label, icon: 'folder', slug: uniq(slugify(label), siblingsSlugs), items: [], ...extra };
  list.push(node);
  return node;
}

/** Cria página; `existing` = conjunto de caminhos já usados (inclui rascunhos e arquivos remotos). */
export function addPage(m, parentId, label, existing = new Set(), extra = {}) {
  const list = parentId ? find(m, parentId).node.items : m.items;
  const folder = folderOf(m, parentId);
  const taken = new Set([...existing, ...allPaths(m)]);
  const base = (folder ? folder + '/' : '') + slugify(label);
  let path = base, i = 2; while (taken.has(path)) path = `${base}-${i++}`;
  const node = { type: 'page', id: newId(m, label), label, icon: 'file-text', path, ...extra };
  list.push(node);
  return node;
}

export function remove(m, id) {
  const f = find(m, id); if (!f) return null;
  f.list.splice(f.list.indexOf(f.node), 1);
  return f.node;
}

const contains = (node, id) => { let r = false; if (node.type === 'category') walk(node.items, (n) => { if (n.id === id) { r = true; return false; } }); return r; };

/** Move `id` para antes/depois de `targetId` ou para dentro (fim) da categoria `targetId`. */
export function move(m, id, targetId, pos) {
  if (id === targetId) return false;
  const src = find(m, id); const tgt = find(m, targetId);
  if (!src || !tgt || contains(src.node, targetId)) return false;
  if (pos === 'inside' && tgt.node.type !== 'category') pos = 'after';
  src.list.splice(src.list.indexOf(src.node), 1);
  if (pos === 'inside') { tgt.node.items.push(src.node); tgt.node.collapsed = false; return true; }
  const t = find(m, targetId); // recalcula índice após remoção
  t.list.splice(t.list.indexOf(t.node) + (pos === 'after' ? 1 : 0), 0, src.node);
  return true;
}

export function moveBy(m, id, delta) {
  const f = find(m, id); if (!f) return false;
  const i = f.list.indexOf(f.node), j = i + delta;
  if (j < 0 || j >= f.list.length) return false;
  [f.list[i], f.list[j]] = [f.list[j], f.list[i]];
  return true;
}

/** Todas as páginas (e caminhos) abaixo de um nó. */
export function pagesUnder(node) {
  if (node.type === 'page') return [node];
  const o = []; walk(node.items, (n) => { if (n.type === 'page') o.push(n); }); return o;
}

/** Validação: caminhos duplicados, ids duplicados, páginas sem arquivo. */
export function validate(m, fileExists) {
  const problems = []; const ids = new Set(); const paths = new Set();
  walk(m.items, (n) => {
    if (ids.has(n.id)) problems.push(`id duplicado: ${n.id}`); ids.add(n.id);
    if (n.type === 'page') {
      if (paths.has(n.path)) problems.push(`caminho duplicado: ${n.path}`); paths.add(n.path);
      if (fileExists && !fileExists(n.path)) problems.push(`arquivo ausente: ${n.path}`);
    }
  });
  return problems;
}

export function normalize(m) {
  if (!m || typeof m !== 'object') return emptyManifest();
  m.items = Array.isArray(m.items) ? m.items : [];
  walk(m.items, (n) => { if (n.type === 'category') n.items = Array.isArray(n.items) ? n.items : []; });
  return m;
}
