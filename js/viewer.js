// Site de leitura. A "casca" (topo, sidebar) é montada uma vez; ao navegar só o conteúdo troca (fluido, sem piscar).
import { h, icon, clear, toggleTheme } from './ui.js';
import { CONFIG } from './config.js';
import * as S from './store.js';
import * as Tree from './tree.js';
import { renderMarkdown } from './md.js';
import { attachPreview } from './hovercard.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function mountViewer(root, firstPath) {
  const m = await S.loadManifest();
  const logged = !!S.state.auth;
  const visible = (n) => !n.hidden && (logged || !n.draft);
  const flat = Tree.pages(m).filter(visible);
  const closed = new Set();   // categorias recolhidas pelo usuário
  const opened = new Set();   // categorias abertas pelo usuário (ganham de "collapsed")
  let observer, current = null;

  if (!firstPath && !flat.length) {
    root.append(h('div', { class: 'v-empty' }, h('h2', {}, m.title || CONFIG.siteName), h('p', {}, 'Ainda não há páginas publicadas.'), h('p', {}, h('a', { href: '#/login/editor' }, 'Entrar para criar a primeira página'))));
    return { cleanup: () => {}, update: async () => {} };
  }
  if (!firstPath) { location.replace('#/docs/' + flat[0].path); return { cleanup: () => {}, update: async () => {} }; }

  // ── topo
  const side = h('aside', { class: 'v-side', 'aria-label': 'Navegação' });
  const searchBox = buildSearch(flat);
  const themeIcon = () => icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18);
  const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Alternar tema', onclick: () => { toggleTheme(); themeBtn.replaceChildren(themeIcon()); } }, themeIcon());
  const actionBtn = h('a', { class: 'btn sm' });
  const top = h('header', { class: 'v-top' },
    h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Abrir menu', onclick: () => side.classList.toggle('open') }, icon('menu', 20)),
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), m.title || CONFIG.siteName),
    h('nav', { class: 'topnav' }, h('a', { href: '#/', class: 'active' }, 'Documentação'), h('a', { href: '#/checklist' }, 'Checklist'), h('a', { href: '#/mensagens' }, 'Mensagens')),
    h('span', { class: 'grow' }), searchBox.el,
    h('a', { class: 'btn ghost sm gh', href: `https://github.com/${CONFIG.owner}/${CONFIG.repo}`, target: '_blank', rel: 'noopener noreferrer' }, icon('github', 15), 'GitHub'),
    themeBtn, actionBtn);

  // ── sidebar (DOM persistente: abrir/fechar anima sem recriar)
  const navLinks = new Map(), catEls = new Map();
  const isOpen = (n) => opened.has(n.id) || (!n.collapsed && !closed.has(n.id));
  const setOpen = (n, v) => {
    if (v) { opened.add(n.id); closed.delete(n.id); } else { opened.delete(n.id); closed.add(n.id); }
    const c = catEls.get(n.id); if (!c) return;
    c.row.classList.toggle('open', v); c.row.setAttribute('aria-expanded', String(v)); c.wrap.classList.toggle('open', v);
    c.wrap.inert = !v;
  };
  const colorFor = (n) => Tree.colorOf(m, n.id);
  const build = (items, parent) => items.filter(visible).forEach((n) => {
    const col = colorFor(n);
    if (n.type === 'category') {
      const row = h('button', { class: 'nav-item', 'aria-expanded': 'false', onclick: () => setOpen(n, !row.classList.contains('open')) },
        icon(n.icon || 'folder', 17, col || 'currentColor'), h('span', { class: 'grow' }, n.label), h('span', { class: 'chev ic' }, icon('chev-r', 14)));
      const inner = h('div', { class: 'nav-sub' }); const wrap = h('div', { class: 'nav-wrap' }, h('div', { class: 'nav-clip' }, inner));
      parent.append(row, wrap); catEls.set(n.id, { row, wrap, node: n });
      build(n.items, inner);
    } else {
      const a = h('a', { class: 'nav-item', href: '#/docs/' + n.path, style: col ? { '--item-color': col } : {}, onclick: () => side.classList.remove('open'), onmouseenter: () => S.loadPage(n.path).catch(() => {}), onfocus: () => S.loadPage(n.path).catch(() => {}) },
        icon(n.icon || 'file-text', 17, col || 'currentColor'), h('span', { class: 'grow' }, n.label), n.draft ? h('span', { class: 'draft-pill' }, 'rascunho') : null);
      parent.append(a); navLinks.set(n.path, a);
    }
  });
  build(m.items, side);
  catEls.forEach(({ node }) => setOpen(node, isOpen(node)));
  // sem animação na primeira pintura
  side.classList.add('no-anim'); requestAnimationFrame(() => requestAnimationFrame(() => side.classList.remove('no-anim')));

  const main = h('main', { class: 'v-main', id: 'conteudo' });
  main.addEventListener('mouseover', (e) => { const a = e.target.closest?.('.prose a[href^="#/docs/"]'); if (a && !a.dataset.pv) { a.dataset.pv = '1'; const p = decodeURIComponent(a.getAttribute('href').slice(7)); attachPreview(a, p, a.textContent); a.dispatchEvent(new MouseEvent('mouseenter')); } });
  const tocEl = h('nav', { class: 'v-toc', 'aria-label': 'Nesta página' });
  root.append(top, h('div', { class: 'v-wrap' }, side, main, tocEl));

  const editHref = (p) => '#/editor' + (p ? '/' + p : '');
  const showPage = async (path) => {
    const node = Tree.findByPath(m, path);
    const page = node ? await S.loadPage(path) : null;
    observer?.disconnect(); clear(main); clear(tocEl);
    navLinks.forEach((a, p) => { a.classList.toggle('on', p === path); a.setAttribute('aria-current', p === path ? 'page' : 'false'); });
    actionBtn.className = logged ? 'btn sm' : 'btn ghost sm'; actionBtn.href = logged ? editHref(path) : '#/login/editor';
    actionBtn.replaceChildren(...(logged ? [icon('pen', 14), 'Editar'] : ['Entrar']));
    const accent = node ? colorFor(node) : '';
    main.style.setProperty('--accent', accent || 'var(--primary)'); main.classList.toggle('accented', !!accent);
    tocEl.style.setProperty('--accent', accent || 'var(--primary)');

    if (!node || !page) {
      main.append(h('div', { class: 'v-empty' }, h('h2', {}, 'Página não encontrada'), h('p', {}, `Não existe "${path}" neste site.`), h('p', {}, h('a', { href: '#/' }, 'Ir para o início'))));
      document.title = 'Não encontrado · ' + (m.title || CONFIG.siteName); return;
    }
    const chain = Tree.ancestors(m, node.id);
    chain.forEach((c) => { if (!isOpen(c)) setOpen(c, true); });
    const title = page.fm.title || node.label;
    document.title = `${title} · ${m.title || CONFIG.siteName}`;
    const { html, toc } = renderMarkdown(page.body, { resolve: S.resolveUrl });
    const crumbs = h('div', { class: 'crumbs' }, h('a', { href: '#/', 'aria-label': 'Início', style: { color: 'var(--text)', display: 'inline-flex' } }, icon('home', 15)));
    chain.forEach((c) => crumbs.append(icon('chev-r', 13), h('span', {}, c.label)));
    crumbs.append(icon('chev-r', 13), h('span', { class: 'cur' }, node.label));
    const i = flat.findIndex((p) => p.path === path); const prev = flat[i - 1], next = flat[i + 1];
    const pg = (p, cls, lab) => h('a', { class: cls, href: '#/docs/' + p.path, onmouseenter: () => S.loadPage(p.path).catch(() => {}) }, h('small', {}, lab), h('b', {}, p.label));
    main.append(crumbs, h('h1', { class: 'doc-title' }, accent ? h('span', { class: 'title-ic' }, icon(node.icon || 'file-text', 30, accent)) : null, title), h('article', { class: 'prose', html }),
      h('div', { class: 'pager' }, prev ? pg(prev, '', '« Anterior') : h('span', { style: { flex: 1 } }), next ? pg(next, 'next', 'Próxima »') : h('span', { style: { flex: 1 } })));
    // entrada suave
    if (!reduce()) { main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); }
    if (page.fm.toc !== false && toc.length) {
      toc.forEach((t) => tocEl.append(h('a', { href: `#/docs/${path}`, class: t.level > 2 ? 'l3' : '', dataset: { id: t.id }, onclick: (e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' }); } }, t.text)));
      observer = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) tocEl.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.id === en.target.id)); }), { rootMargin: '-70px 0px -70% 0px' });
      setTimeout(() => toc.forEach((t) => { const el = document.getElementById(t.id); if (el) observer.observe(el); }), 0);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    // pré-carrega vizinhas para a próxima navegação ser instantânea
    [prev, next].forEach((p) => p && S.loadPage(p.path).catch(() => {}));
    // mantém o item ativo visível na sidebar
    const act = navLinks.get(path);
    if (act) { const sr = side.getBoundingClientRect(), ar = act.getBoundingClientRect(); if (ar.top < sr.top + 8) side.scrollTop -= sr.top + 8 - ar.top; else if (ar.bottom > sr.bottom - 8) side.scrollTop += ar.bottom - sr.bottom + 8; }
  };

  await showPage(firstPath);
  current = firstPath;
  return {
    live: true,
    update: async (path) => { if (path === current) return; current = path; await showPage(path); },
    cleanup: () => { observer?.disconnect(); searchBox.destroy(); },
  };
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
  const key = (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { e.preventDefault(); input.focus(); } };
  document.addEventListener('keydown', key);
  const away = (e) => { if (!el.contains(e.target)) list.classList.add('hidden'); };
  document.addEventListener('mousedown', away);
  input.addEventListener('focus', () => { if (input.value) render(); });
  return { el, destroy: () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', away); } };
}
