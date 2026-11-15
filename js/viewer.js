// Site de leitura (a "documentação" em si).
import { h, icon, clear, toggleTheme } from './ui.js';
import { CONFIG } from './config.js';
import * as S from './store.js';
import * as Tree from './tree.js';
import { renderMarkdown } from './md.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const open = new Set();   // categorias abertas pelo usuário

export async function mountViewer(root, path) {
  const m = await S.loadManifest();
  const logged = !!S.state.auth;
  const visible = (n) => !n.hidden && (logged || !n.draft);
  const flat = Tree.pages(m).filter(visible);

  if (!path) {
    if (flat[0]) { location.replace('#/docs/' + flat[0].path); return () => {}; }
    root.append(h('div', { class: 'v-empty' }, h('h2', {}, m.title || CONFIG.siteName), h('p', {}, 'Ainda não há páginas publicadas.'),
      h('p', {}, h('a', { href: '#/editor' }, 'Entrar para criar a primeira página'))));
    return () => {};
  }

  const node = Tree.findByPath(m, path);
  const page = node ? await S.loadPage(path) : null;
  const chain = node ? Tree.ancestors(m, node.id) : [];
  chain.forEach((c) => open.add(c.id));

  // ── topo
  const side = h('aside', { class: 'v-side', 'aria-label': 'Navegação' });
  const searchBox = buildSearch(flat);
  const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Alternar tema', onclick: () => { toggleTheme(); themeBtn.replaceChildren(icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18)); } },
    icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18));
  const editHref = '#/editor' + (path ? '/' + path : '');
  const top = h('header', { class: 'v-top' },
    h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Abrir menu', onclick: () => side.classList.toggle('open') }, icon('menu', 20)),
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), m.title || CONFIG.siteName),
    h('nav', {}, h('a', { href: '#/', class: 'active' }, 'Documentação')),
    h('span', { class: 'grow' }), searchBox.el,
    h('a', { class: 'btn ghost sm', href: `https://github.com/${CONFIG.owner}/${CONFIG.repo}`, target: '_blank', rel: 'noopener noreferrer' }, icon('github', 15), 'GitHub'),
    themeBtn,
    logged ? h('a', { class: 'btn sm', href: editHref }, icon('pen', 14), 'Editar') : h('a', { class: 'btn ghost sm', href: editHref }, 'Entrar'));

  // ── sidebar
  const renderNav = () => {
    clear(side);
    const build = (items, parent) => items.filter(visible).forEach((n) => {
      if (n.type === 'category') {
        const isOpen = open.has(n.id) || (!n.collapsed && !open.has('closed:' + n.id));
        const row = h('button', { class: `nav-item${isOpen ? ' open' : ''}`, 'aria-expanded': String(isOpen), onclick: () => { if (isOpen) { open.delete(n.id); open.add('closed:' + n.id); } else { open.add(n.id); open.delete('closed:' + n.id); } renderNav(); } },
          icon(n.icon || 'folder', 17, n.iconColor || 'currentColor'), h('span', { class: 'grow' }, n.label), h('span', { class: 'chev ic' }, icon('chev-r', 14)));
        parent.append(row);
        if (isOpen) { const sub = h('div', { class: 'nav-sub' }); parent.append(sub); build(n.items, sub); }
      } else {
        parent.append(h('a', { class: `nav-item${n.path === path ? ' on' : ''}`, href: '#/docs/' + n.path, onclick: () => side.classList.remove('open') },
          icon(n.icon || 'file-text', 17, n.iconColor || 'currentColor'), h('span', { class: 'grow' }, n.label), n.draft ? h('span', { class: 'draft-pill' }, 'rascunho') : null));
      }
    });
    build(m.items, side);
  };
  renderNav();

  // ── conteúdo
  const main = h('main', { class: 'v-main', id: 'conteudo' });
  const tocEl = h('nav', { class: 'v-toc', 'aria-label': 'Nesta página' });
  let observer;
  if (!node || !page) {
    main.append(h('div', { class: 'v-empty' }, h('h2', {}, 'Página não encontrada'), h('p', {}, `Não existe "${path}" neste site.`), h('p', {}, h('a', { href: '#/' }, 'Ir para o início'))));
    document.title = 'Não encontrado · ' + (m.title || CONFIG.siteName);
  } else {
    const title = page.fm.title || node.label;
    document.title = `${title} · ${m.title || CONFIG.siteName}`;
    const { html, toc } = renderMarkdown(page.body, { resolve: S.resolveUrl });
    const crumbs = h('div', { class: 'crumbs' }, h('a', { href: '#/', 'aria-label': 'Início', style: { color: 'var(--text)', display: 'inline-flex' } }, icon('home', 15)));
    chain.forEach((c) => crumbs.append(icon('chev-r', 13), h('span', {}, c.label)));
    crumbs.append(icon('chev-r', 13), h('span', { class: 'cur' }, node.label));
    const i = flat.findIndex((p) => p.path === path);
    const prev = flat[i - 1], next = flat[i + 1];
    main.append(crumbs, h('h1', { class: 'doc-title' }, title), h('article', { class: 'prose', html }),
      h('div', { class: 'pager' },
        prev ? h('a', { href: '#/docs/' + prev.path }, h('small', {}, '« Anterior'), h('b', {}, prev.label)) : h('span', { style: { flex: 1 } }),
        next ? h('a', { class: 'next', href: '#/docs/' + next.path }, h('small', {}, 'Próxima »'), h('b', {}, next.label)) : h('span', { style: { flex: 1 } })));
    if (page.fm.toc !== false && toc.length) {
      toc.forEach((t) => tocEl.append(h('a', { href: `#/docs/${path}`, class: t.level > 2 ? 'l3' : '', dataset: { id: t.id }, onclick: (e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }); } }, t.text)));
      observer = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) tocEl.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.id === en.target.id)); }), { rootMargin: '-70px 0px -70% 0px' });
      setTimeout(() => toc.forEach((t) => { const el = document.getElementById(t.id); if (el) observer.observe(el); }), 0);
    }
    window.scrollTo(0, 0);
  }

  root.append(top, h('div', { class: 'v-wrap' }, side, main, tocEl));
  return () => { observer?.disconnect(); searchBox.destroy(); };
}

function buildSearch(pages) {
  const input = h('input', { class: 'input', placeholder: 'Buscar…  ( / )', 'aria-label': 'Buscar páginas', autocomplete: 'off' });
  const list = h('div', { class: 'v-results hidden', role: 'listbox' });
  const el = h('div', { class: 'v-search' }, icon('search', 15), input, list);
  let sel = 0, res = [];
  const render = () => {
    clear(list);
    list.classList.toggle('hidden', !input.value.trim());
    if (!input.value.trim()) return;
    res.forEach((p, i) => list.append(h('a', { href: '#/docs/' + p.path, class: i === sel ? 'sel' : '', onclick: () => { input.value = ''; render(); } }, icon(p.icon || 'file-text', 15, p.iconColor || 'currentColor'), p.label)));
    if (!res.length) list.append(h('div', { class: 'muted small', style: { padding: '8px 10px' } }, 'Nada encontrado.'));
  };
  input.addEventListener('input', () => { const q = norm(input.value.trim()); res = q ? pages.filter((p) => norm(p.label).includes(q)).slice(0, 8) : []; sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(res.length - 1, sel + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && res[sel]) { location.hash = '#/docs/' + res[sel].path; input.value = ''; render(); }
    else if (e.key === 'Escape') { input.value = ''; render(); input.blur(); }
  });
  const key = (e) => { if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { e.preventDefault(); input.focus(); } };
  document.addEventListener('keydown', key);
  const away = (e) => { if (!el.contains(e.target)) { list.classList.add('hidden'); } };
  document.addEventListener('mousedown', away);
  input.addEventListener('focus', () => { if (input.value) render(); });
  return { el, destroy: () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', away); } };
}
