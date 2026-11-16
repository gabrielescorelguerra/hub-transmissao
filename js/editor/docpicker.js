// Seletor de conteúdo para o checklist: árvore pesquisável com pastas e páginas.
// Valor: '' (nenhum) | caminho da página | 'folder:<id da pasta>'.
import { h, icon, modal } from '../ui.js';
import * as Tree from '../tree.js';

export const FOLDER = 'folder:';

/** Resolve um valor em { kind, node, label, color, href, crumb } ou null. */
export function resolveRef(m, value) {
  if (!value) return null;
  if (value.startsWith(FOLDER)) {
    const f = Tree.find(m, value.slice(FOLDER.length)); if (!f || f.node.type !== 'category') return null;
    const first = Tree.pagesUnder(f.node).find((p) => !p.hidden) || Tree.pagesUnder(f.node)[0];
    return { kind: 'folder', node: f.node, label: f.node.label, color: Tree.colorOf(m, f.node.id), href: first ? '#/docs/' + first.path : '', crumb: Tree.ancestors(m, f.node.id).map((c) => c.label).join(' › '), count: Tree.pagesUnder(f.node).length };
  }
  const n = Tree.findByPath(m, value); if (!n) return null;
  return { kind: 'page', node: n, label: n.label, color: Tree.colorOf(m, n.id), href: '#/docs/' + n.path, crumb: Tree.ancestors(m, n.id).map((c) => c.label).join(' › ') };
}

/** Botão que mostra a seleção atual e abre o seletor. */
export function docPickerButton(m, value, onChange) {
  const btn = h('button', { type: 'button', class: 'docpick-btn', 'aria-label': 'Escolher conteúdo vinculado', onclick: async () => { const r = await pickDoc(m, value); if (r !== null) { value = r; draw(); onChange(r); } } });
  const draw = () => {
    const r = resolveRef(m, value);
    btn.replaceChildren(r ? icon(r.node.icon || (r.kind === 'folder' ? 'folder' : 'file-text'), 15, r.color || 'currentColor') : icon('link', 15),
      h('span', { class: 'grow' }, r ? r.label : 'Vincular conteúdo…'),
      r ? h('span', { class: 'docpick-tag' }, r.kind === 'folder' ? 'Pasta' : 'Página') : null);
    btn.classList.toggle('set', !!r);
  };
  draw();
  return btn;
}

/** Abre o modal. Resolve com o novo valor ('' = remover) ou null se cancelado. */
export function pickDoc(m, current = '') {
  return new Promise((resolve) => {
    let q = '', sel = current, done = false;
    const open = new Set(); // pastas expandidas
    const cur = resolveRef(m, current); if (cur) Tree.ancestors(m, cur.node.id).forEach((c) => open.add(c.id));
    const finish = (v) => { if (done) return; done = true; mod.close(); resolve(v); };
    const list = h('div', { class: 'docpick-list', role: 'listbox' });
    const search = h('input', { class: 'input', placeholder: 'Buscar página ou pasta…', 'aria-label': 'Buscar conteúdo', autofocus: true, oninput: (e) => { q = e.target.value.trim().toLowerCase(); draw(); } });
    const sum = h('span', { class: 'muted small grow' });
    const val = (n) => (n.type === 'category' ? FOLDER + n.id : n.path);
    const row = (n, depth, crumb) => {
      const isCat = n.type === 'category'; const v = val(n); const on = v === sel;
      const col = Tree.colorOf(m, n.id);
      const r = h('div', { class: `docpick-row${on ? ' on' : ''}`, role: 'option', 'aria-selected': String(on), style: { paddingLeft: (10 + depth * 18) + 'px' }, tabIndex: 0,
        onclick: () => { sel = v; draw(); }, ondblclick: () => finish(v),
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); sel = v; finish(v); } else if (e.key === ' ') { e.preventDefault(); sel = v; draw(); } } });
      if (isCat && !q) r.append(h('button', { type: 'button', class: `dp-chev${open.has(n.id) ? ' open' : ''}`, 'aria-label': open.has(n.id) ? 'Recolher' : 'Expandir', onclick: (e) => { e.stopPropagation(); open.has(n.id) ? open.delete(n.id) : open.add(n.id); draw(); } }, icon('chev-r', 14)));
      else r.append(h('span', { class: 'dp-chev spacer' }));
      r.append(icon(n.icon || (isCat ? 'folder' : 'file-text'), 16, col || 'currentColor'), h('span', { class: 'dp-label' }, n.label),
        crumb ? h('span', { class: 'dp-crumb' }, crumb) : null,
        isCat ? h('span', { class: 'docpick-tag' }, `Pasta · ${Tree.pagesUnder(n).length}`) : null,
        on ? icon('check', 15, 'var(--primary)') : null);
      return r;
    };
    const draw = () => {
      const y = list.scrollTop; list.replaceChildren();
      const vis = (n) => !n.hidden;
      if (q) {
        const hits = [];
        Tree.walk(m.items, (n) => { if (vis(n) && n.label.toLowerCase().includes(q)) hits.push(n); });
        hits.forEach((n) => list.append(row(n, 0, Tree.ancestors(m, n.id).map((c) => c.label).join(' › '))));
        if (!hits.length) list.append(h('p', { class: 'muted', style: { padding: '24px', textAlign: 'center' } }, 'Nada encontrado.'));
      } else {
        const rec = (items, depth) => items.filter(vis).forEach((n) => { list.append(row(n, depth)); if (n.type === 'category' && open.has(n.id)) rec(n.items || [], depth + 1); });
        rec(m.items, 0);
      }
      const r = resolveRef(m, sel);
      sum.textContent = r ? `Selecionado: ${r.label}${r.kind === 'folder' ? ' (pasta inteira)' : ''}` : 'Nenhum conteúdo selecionado';
      list.scrollTop = y;
    };
    const mod = modal({
      title: 'Vincular conteúdo', sub: 'Escolha uma página ou uma pasta inteira. Duplo clique confirma.', width: 560,
      body: h('div', { class: 'stack' }, h('div', { class: 'tree-search' }, icon('search', 15), search), list),
      onClose: () => { if (!done) { done = true; resolve(null); } },
      footer: [sum, h('button', { class: 'btn ghost', onclick: () => finish('') }, 'Remover vínculo'), h('button', { class: 'btn', onclick: () => finish(null) }, 'Cancelar'), h('button', { class: 'btn primary', onclick: () => finish(sel) }, 'Aplicar')],
    });
    draw();
  });
}
