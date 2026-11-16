// Árvore de navegação editável: arrastar, renomear, ícones, nova página/seção, excluir.
import { h, icon, clear, menu } from '../ui.js';
import * as S from '../store.js';
import * as Tree from '../tree.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function createSidebar(ed) {
  const el = h('aside', { class: 'ed-side', 'aria-label': 'Estrutura do site' });
  const treeEl = h('div', { class: 'tree', role: 'tree' });
  let query = '';
  let renaming = null;

  const search = h('input', { placeholder: 'Buscar página…', 'aria-label': 'Buscar página', oninput: (e) => { query = norm(e.target.value.trim()); render(); } });
  el.append(
    h('div', { class: 'side-head' }, h('span', { class: 'eyebrow' }, 'Estrutura'),
      h('div', { style: { display: 'flex', gap: '6px' } },
        h('button', { class: 'sq', title: 'Nova seção', 'aria-label': 'Nova seção', onclick: () => ed.createCategory(parentForNew()) }, icon('folder', 14)),
        h('button', { class: 'sq', title: 'Nova página', 'aria-label': 'Nova página', onclick: () => ed.createPage(parentForNew()) }, icon('plus', 14)))),
    h('label', { class: 'tree-search' }, icon('search', 14), search),
    treeEl,
    h('div', { class: 'side-foot' },
      h('button', { class: 'dashed', onclick: () => ed.createCategory(null) }, icon('plus', 14), 'Nova seção'),
      h('button', { class: 'dashed', onclick: () => ed.createPage(null) }, icon('plus', 14), 'Nova página')));

  function parentForNew() {
    const n = ed.node(); if (!n) return null;
    if (n.type === 'category') return n.id;
    return Tree.find(ed.manifest(), n.id)?.parent?.id || null;
  }

  const matches = (n) => !query || norm(n.label).includes(query) || (n.type === 'category' && n.items.some(matches));

  function row(n, depth) {
    const isCat = n.type === 'category';
    const open = isCat && (query ? true : !ed.collapsed.has(n.id));
    const r = h('div', { class: `t-row${ed.sel === n.id ? ' sel' : ''}${n.hidden ? ' hid' : ''}`, role: 'treeitem', 'aria-selected': String(ed.sel === n.id), 'aria-expanded': isCat ? String(open) : undefined, tabindex: '0', draggable: 'true', dataset: { id: n.id }, style: { paddingLeft: 4 + depth * 16 + 'px' } });
    r.append(h('span', { class: 'grip', 'aria-hidden': 'true' }, icon('grip', 12)));
    r.append(isCat ? h('span', { class: `chev${open ? ' open' : ''}`, onclick: (e) => { e.stopPropagation(); toggle(n); } }, icon('chev-r', 13)) : h('span', { class: 'chev' }));
    r.append(h('span', { class: 'ic', title: 'Mudar ícone', onclick: (e) => { e.stopPropagation(); ed.chooseIcon(n); } }, icon(n.icon || (isCat ? 'folder' : 'file-text'), 17, Tree.colorOf(ed.manifest(), n.id) || 'currentColor')));
    if (renaming === n.id) {
      r.classList.add('rename');
      const inp = h('input', { value: n.label, 'aria-label': 'Novo nome' });
      const end = (ok) => { if (renaming !== n.id) return; renaming = null; const v = inp.value.trim(); if (ok && v && v !== n.label) ed.updateMeta(n, { label: v, ...(n.type === 'page' && ed.doc?.path === n.path && !ed.doc.fm.title ? {} : {}) }); render(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false); e.stopPropagation(); });
      inp.addEventListener('blur', () => end(true));
      inp.addEventListener('click', (e) => e.stopPropagation());
      r.append(inp); r.draggable = false;
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    } else {
      r.append(h('span', { class: 't-label' }, n.label));
      if (n.draft) r.append(h('span', { class: 'tag-d' }, 'rascunho'));
      r.append(h('button', { class: 'icon-btn t-more', style: { width: '24px', height: '24px' }, 'aria-label': `Ações de ${n.label}`, onclick: (e) => { e.stopPropagation(); openMenu(n, e.currentTarget); } }, icon('dots', 15)));
    }
    r.addEventListener('click', () => { if (renaming) return; if (isCat) { toggle(n, true); } ed.select(n.id); });
    r.addEventListener('dblclick', (e) => { e.preventDefault(); renaming = n.id; render(); });
    r.addEventListener('contextmenu', (e) => { e.preventDefault(); openMenu(n, { x: e.clientX, y: e.clientY }); });
    r.addEventListener('keydown', (e) => {
      if (e.target !== r) return;
      if (e.key === 'Enter') ed.select(n.id);
      else if (e.key === 'F2') { renaming = n.id; render(); }
      else if (e.key === 'Delete') ed.deleteNode(n);
      else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); S.editManifest((m) => Tree.moveBy(m, n.id, -1)); setTimeout(() => focusRow(n.id), 0); }
      else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); S.editManifest((m) => Tree.moveBy(m, n.id, 1)); setTimeout(() => focusRow(n.id), 0); }
    });
    // arrastar e soltar
    r.addEventListener('dragstart', (e) => { ed.dragId = n.id; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', n.id); });
    r.addEventListener('dragend', () => { ed.dragId = null; r.classList.remove('dragging'); clearDrops(); });
    r.addEventListener('dragover', (e) => {
      if (!ed.dragId || ed.dragId === n.id) return;
      e.preventDefault(); clearDrops();
      const rect = r.getBoundingClientRect(); const y = (e.clientY - rect.top) / rect.height;
      const pos = isCat ? (y < .25 ? 'before' : y > .75 && !open ? 'after' : 'inside') : (y < .5 ? 'before' : 'after');
      r.classList.add('drop-' + pos); r.dataset.pos = pos;
    });
    r.addEventListener('dragleave', () => { r.classList.remove('drop-before', 'drop-after', 'drop-inside'); });
    r.addEventListener('drop', (e) => {
      e.preventDefault(); const pos = r.dataset.pos; const id = ed.dragId; clearDrops(); ed.dragId = null;
      if (!id || id === n.id || !pos) return;
      if (!S.editManifest((m) => Tree.move(m, id, n.id, pos))) return;
      if (pos === 'inside') ed.collapsed.delete(n.id);
    });
    return r;
  }
  const clearDrops = () => treeEl.querySelectorAll('.drop-before,.drop-after,.drop-inside').forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-inside'));
  const focusRow = (id) => treeEl.querySelector(`[data-id="${CSS.escape(id)}"]`)?.focus();
  const toggle = (n, forceOpen) => { if (ed.collapsed.has(n.id)) ed.collapsed.delete(n.id); else if (!forceOpen) ed.collapsed.add(n.id); render(); };

  function openMenu(n, anchor) {
    const isCat = n.type === 'category';
    menu(anchor, [
      { label: 'Renomear', icon: 'pen', hint: 'F2', onClick: () => { renaming = n.id; render(); } },
      { label: 'Mudar ícone', icon: 'star', onClick: () => ed.chooseIcon(n) },
      ...(isCat ? [{ label: 'Nova página aqui', icon: 'plus', onClick: () => ed.createPage(n.id) }, { label: 'Nova subseção', icon: 'folder', onClick: () => ed.createCategory(n.id) }] : [{ label: 'Duplicar', icon: 'copy', onClick: () => ed.duplicate(n) }]),
      { sep: true },
      { label: 'Mover para cima', icon: 'arrow-up', hint: 'Alt+↑', onClick: () => S.editManifest((m) => Tree.moveBy(m, n.id, -1)) },
      { label: 'Mover para baixo', icon: 'arrow-down', hint: 'Alt+↓', onClick: () => S.editManifest((m) => Tree.moveBy(m, n.id, 1)) },
      { label: n.hidden ? 'Mostrar no menu' : 'Ocultar do menu', icon: 'eye', onClick: () => ed.updateMeta(n, { hidden: !n.hidden }) },
      { sep: true },
      { label: 'Excluir', icon: 'trash', danger: true, hint: 'Del', onClick: () => ed.deleteNode(n) },
    ], { align: 'right' });
  }

  function render() {
    const keepScroll = treeEl.scrollTop;
    clear(treeEl);
    const build = (items, depth) => items.filter(matches).forEach((n) => {
      treeEl.append(row(n, depth));
      if (n.type === 'category' && (query || !ed.collapsed.has(n.id))) build(n.items, depth + 1);
    });
    const m = ed.manifest();
    build(m.items, 0);
    if (!treeEl.firstChild) treeEl.append(h('p', { class: 'muted small', style: { padding: '8px' } }, query ? 'Nenhuma página encontrada.' : 'Nenhuma página ainda.'));
    treeEl.scrollTop = keepScroll;
    // soltar no espaço vazio = mover para o fim da raiz
    treeEl.ondragover = (e) => { if (ed.dragId && e.target === treeEl) e.preventDefault(); };
    treeEl.ondrop = (e) => { if (ed.dragId && e.target === treeEl) { e.preventDefault(); const id = ed.dragId; ed.dragId = null; S.editManifest((mm) => { const n = Tree.remove(mm, id); if (n) mm.items.push(n); }); } };
  }

  return { el, render };
}
