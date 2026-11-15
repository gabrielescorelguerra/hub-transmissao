// Painel de propriedades (Página / Seção / SEO).
import { h, icon, clear } from '../ui.js';
import { pagePath } from '../config.js';
import * as S from '../store.js';
import * as Tree from '../tree.js';

export function createPanel(ed) {
  const el = h('aside', { class: 'ed-panel', 'aria-label': 'Propriedades' });
  const sync = h('div', { class: 'sync-ok' });

  const toggle = (on, onChange, label) => {
    const b = h('button', { class: 'toggle', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label, onclick: () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); onChange(v); } });
    return b;
  };
  const field = (label, input, hint) => h('div', { class: 'field' }, h('label', {}, label), input, hint ? h('span', { class: 'hint' }, hint) : null);

  function refreshSync() {
    const n = ed.node();
    if (!n || n.type !== 'page') { sync.replaceChildren(); return; }
    const mod = S.isModified(pagePath(n.path)) || S.isModified('content/sidebar.json');
    sync.className = 'sync-ok' + (mod ? ' pend' : '');
    sync.replaceChildren(icon(mod ? 'clock' : 'check', 14), mod ? 'Alterações não publicadas' : 'Sincronizado com o GitHub');
  }

  function render() {
    clear(el);
    const n = ed.node();
    const isPage = n?.type === 'page';
    const tab = n?.type === 'category' ? 'cat' : ed.panelTab;
    const tabs = isPage
      ? h('div', { class: 'tabs' }, [['page', 'Página'], ['seo', 'SEO']].map(([k, l]) => h('button', { class: ed.panelTab === k ? 'on' : '', onclick: () => { ed.panelTab = k; render(); } }, l)))
      : h('div', { class: 'tabs' }, h('button', { class: 'on' }, n ? 'Seção' : 'Propriedades'));
    el.append(tabs);
    if (!n) { el.append(h('div', { class: 'panel-body' }, h('p', { class: 'muted' }, 'Selecione um item na barra lateral.'))); return; }

    const body = h('div', { class: 'panel-body' });
    const iconRow = h('div', { class: 'field' }, h('label', {}, 'Ícone no menu'),
      h('div', { class: 'icon-row' }, h('span', { class: 'icon-tile' }, icon(n.icon || (n.type === 'category' ? 'folder' : 'file-text'), 20, n.iconColor || 'currentColor')),
        h('div', { class: 'grow' }, h('div', { style: { fontWeight: 500 } }, n.icon?.startsWith('emoji:') ? 'Emoji' : n.icon || 'padrão'), h('div', { class: 'muted small' }, 'Aparece na sidebar do site')),
        h('button', { class: 'btn sm', onclick: () => ed.chooseIcon(n) }, 'Trocar')));
    const labelIn = h('input', { class: 'input', value: n.label, 'aria-label': 'Nome no menu', onchange: (e) => { const v = e.target.value.trim(); if (v) ed.updateMeta(n, { label: v }); else e.target.value = n.label; } });

    if (n.type === 'category') {
      body.append(field('Nome da seção', labelIn), iconRow,
        h('div', { class: 'toggle-row' }, h('span', {}, 'Iniciar recolhida no site'), toggle(n.collapsed, (v) => ed.updateMeta(n, { collapsed: v }), 'Iniciar recolhida')),
        h('div', { class: 'toggle-row' }, h('span', {}, 'Ocultar do menu'), toggle(n.hidden, (v) => ed.updateMeta(n, { hidden: v }), 'Ocultar do menu')),
        h('hr', { class: 'hr' }),
        h('p', { class: 'muted small' }, `${Tree.pagesUnder(n).length} página(s) dentro desta seção.`),
        h('button', { class: 'btn danger', onclick: () => ed.deleteNode(n) }, icon('trash', 14), 'Excluir seção'));
    } else if (tab === 'page') {
      const slug = h('input', { class: 'input', value: n.path, 'aria-label': 'Endereço', style: { fontFamily: 'var(--mono)', fontSize: '12.5px' }, onchange: async (e) => { if (!(await ed.renamePath(n, e.target.value))) e.target.value = n.path; } });
      body.append(field('Nome no menu', labelIn, 'Pode ser diferente do título da página.'), iconRow, field('Endereço (caminho)', slug, 'Renomear move o arquivo ao publicar.'),
        h('hr', { class: 'hr' }),
        h('div', { class: 'toggle-row' }, h('span', {}, 'Mostrar índice (TOC)'), toggle(ed.doc?.fm.toc !== false, (v) => ed.updateMeta(n, { toc: v }), 'Mostrar índice')),
        h('div', { class: 'toggle-row' }, h('span', {}, 'Ocultar do menu'), toggle(n.hidden, (v) => ed.updateMeta(n, { hidden: v }), 'Ocultar do menu')),
        h('div', { class: 'toggle-row' }, h('span', {}, 'Marcar como rascunho'), toggle(n.draft, (v) => ed.updateMeta(n, { draft: v }), 'Rascunho')),
        h('p', { class: 'muted small' }, 'Rascunhos só aparecem para quem está logado.'),
        h('hr', { class: 'hr' }),
        h('div', { class: 'field' }, h('label', {}, 'Arquivo'), h('div', { class: 'file-chip' }, icon('file-text', 14), h('span', { class: 't' }, pagePath(n.path)), h('button', { class: 'icon-btn', style: { width: '24px', height: '24px' }, 'aria-label': 'Abrir no código', onclick: () => ed.setMode('code') }, icon('code', 14)))),
        sync);
    } else {
      const d = h('textarea', { class: 'input', rows: 4, maxlength: 300, 'aria-label': 'Descrição', value: ed.doc?.fm.description || '', onchange: (e) => ed.updateMeta(n, { description: e.target.value.trim() }) });
      d.value = ed.doc?.fm.description || '';
      const t = h('input', { class: 'input', value: ed.doc?.fm.title || '', 'aria-label': 'Título', onchange: (e) => { ed.updateMeta(n, { title: e.target.value.trim() }); } });
      body.append(field('Título da página', t), field('Descrição', d, 'Resumo curto (até 300 caracteres) guardado no frontmatter.'));
    }
    el.append(body);
    refreshSync();
  }
  return { el, render, refreshSync };
}
