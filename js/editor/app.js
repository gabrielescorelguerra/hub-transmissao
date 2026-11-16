// Casca do editor: barra superior, modos (visual / código / dividido) e operações sobre páginas e seções.
import { h, icon, clear, toast, ask, menu, toggleTheme, debounce, $ } from '../ui.js';
import { CONFIG, pagePath, MANIFEST_PATH } from '../config.js';
import * as S from '../store.js';
import * as Tree from '../tree.js';
import { parseBlocks, blocksToMd, composeFile, renderMarkdown, slugify } from '../md.js';
import { createSidebar } from './sidebar.js';
import { createVisual } from './visual.js';
import { createPanel } from './panel.js';
import { createCode } from './code.js';
import { openPublish } from './publish.js';
import { pickIcon } from './iconpicker.js';

const LSget = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const LSset = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } };

export async function mountEditor(root, initialPath) {
  await S.loadManifest();
  const ed = {
    root, mode: ['visual', 'code', 'split'].includes(LSget('hub.mode')) ? LSget('hub.mode') : 'visual',
    sel: null, doc: null, collapsed: new Set(), dragId: null, panelTab: 'page',
  };
  Tree.walk(S.manifest().items, (n) => { if (n.type === 'category' && n.collapsed) ed.collapsed.add(n.id); });

  // ───────── helpers de dados ─────────
  ed.manifest = () => S.manifest();
  ed.node = () => (ed.sel ? Tree.find(S.manifest(), ed.sel)?.node || null : null);
  ed.pagePaths = () => new Set(S.allFilePaths().filter((p) => p.startsWith(CONFIG.contentDir + '/') && p.endsWith('.md')).map((p) => p.slice(CONFIG.contentDir.length + 1, -3)));
  ed.stubFile = (label, extraFm = {}) => composeFile({ title: label, sidebar_label: label, icon: 'file-text', ...extraFm }, '');

  ed.docDirty = false;
  ed.commitDoc = () => { if (!ed.doc || !ed.docDirty) return; ed.docDirty = false; S.savePage(ed.doc.path, ed.doc.fm, ed.docMd()); ed.afterDocCommit?.(); };
  ed.docMd = () => blocksToMd(ed.doc.blocks.filter((b) => !(b.type === 'p' && !b.text)));
  ed.scheduleCommit = debounce(() => ed.commitDoc(), 300);
  ed.flush = () => ed.scheduleCommit.flush();
  ed.touch = () => { ed.docDirty = true; ed.scheduleCommit(); };

  ed.loadDoc = async (node) => {
    ed.flush();
    if (!node || node.type !== 'page') { ed.doc = null; return; }
    let p = await S.loadPage(node.path);
    if (!p) { S.setText(pagePath(node.path), ed.stubFile(node.label)); p = await S.loadPage(node.path); }
    ed.doc = { path: node.path, fm: { ...p.fm }, blocks: parseBlocks(p.body) };
  };
  ed.reloadDoc = async () => { const n = ed.node(); ed.scheduleCommit.cancel(); ed.docDirty = false; await ed.loadDoc(n); };

  // ───────── seleção ─────────
  ed.select = async (id) => {
    ed.flush();
    ed.sel = id;
    const n = ed.node();
    await ed.loadDoc(n);
    if (n) { LSset('hub.last', id); history.replaceState(null, '', '#/editor' + (n.type === 'page' ? '/' + n.path : '')); }
    ed.renderBody(); sidebar.render(); panel.render();
    if (n?.type === 'page') code.open(pagePath(n.path));
    const t = $('.title-input'); if (t && ed.doc && !ed.doc.fm.title) t.focus();
  };

  // ───────── operações de estrutura ─────────
  ed.applyAccent = () => {
    const n = ed.node(); const pg = document.querySelector('.ed-canvas .page'); if (!pg || !n) return;
    const c = Tree.colorOf(S.manifest(), n.id);
    pg.classList.toggle('accented', !!c); if (c) pg.style.setProperty('--accent', c); else pg.style.removeProperty('--accent');
  };
  ed.updateMeta = async (node, patch) => {
    const fmPatch = {}; const mPatch = {};
    if ('title' in patch) fmPatch.title = patch.title;
    if ('label' in patch) { mPatch.label = patch.label; fmPatch.sidebar_label = patch.label; }
    if ('icon' in patch) { mPatch.icon = patch.icon; fmPatch.icon = patch.icon; }
    if ('iconColor' in patch) { mPatch.iconColor = patch.iconColor || undefined; fmPatch.icon_color = patch.iconColor || undefined; }
    if ('hidden' in patch) mPatch.hidden = patch.hidden || undefined;
    if ('draft' in patch) { mPatch.draft = patch.draft || undefined; fmPatch.draft = patch.draft || undefined; }
    if ('toc' in patch) fmPatch.toc = patch.toc;
    if ('description' in patch) fmPatch.description = patch.description;
    if ('collapsed' in patch) mPatch.collapsed = patch.collapsed || undefined;
    if (Object.keys(mPatch).length) S.editManifest((m) => { const t = Tree.find(m, node.id)?.node; if (t) { Object.assign(t, mPatch); Object.keys(mPatch).forEach((k) => mPatch[k] === undefined && delete t[k]); } });
    if (node.type === 'page' && Object.keys(fmPatch).length) {
      if (ed.doc && ed.doc.path === node.path) {
        for (const [k, v] of Object.entries(fmPatch)) { if (v === undefined || v === '' || (v === false && k !== 'toc')) delete ed.doc.fm[k]; else ed.doc.fm[k] = v; }
        ed.touch();
      } else await S.patchPageFm(node.path, fmPatch);
    }
  };

  ed.createPage = async (parentId, label) => {
    label = label ?? await ask({ title: 'Nova página', input: true, placeholder: 'Nome da página', confirm: 'Criar' });
    if (!label) return;
    const node = S.editManifest((m) => Tree.addPage(m, parentId, label, ed.pagePaths()));
    S.setText(pagePath(node.path), ed.stubFile(label));
    if (parentId) ed.collapsed.delete(parentId);
    await ed.select(node.id);
    setTimeout(() => $('.title-input')?.select(), 50);
  };
  ed.createCategory = async (parentId, label) => {
    label = label ?? await ask({ title: 'Nova categoria', input: true, placeholder: 'Nome da categoria', confirm: 'Criar' });
    if (!label) return;
    const node = S.editManifest((m) => Tree.addCategory(m, parentId, label));
    if (parentId) ed.collapsed.delete(parentId);
    await ed.select(node.id);
  };
  ed.duplicate = async (node) => {
    ed.flush();
    const text = await S.readText(pagePath(node.path));
    const label = `${node.label} (cópia)`;
    const created = S.editManifest((m) => {
      const f = Tree.find(m, node.id); const parentId = f.parent?.id || null;
      const n = Tree.addPage(m, parentId, label, ed.pagePaths(), { icon: node.icon, iconColor: node.iconColor });
      f.list.splice(f.list.indexOf(n), 1); f.list.splice(f.list.indexOf(Tree.find(m, node.id).node) + 1, 0, n);
      return n;
    });
    S.setText(pagePath(created.path), (text ?? ed.stubFile(label)).replace(/^(title:).*$/m, `$1 ${JSON.stringify(label)}`).replace(/^(sidebar_label:).*$/m, `$1 ${JSON.stringify(label)}`));
    await ed.select(created.id);
  };
  ed.deleteNode = async (node) => {
    const ps = Tree.pagesUnder(node);
    const what = node.type === 'category' ? `a seção "${node.label}" e ${ps.length} página(s)` : `a página "${node.label}"`;
    if (!await ask({ title: 'Excluir', message: `Excluir ${what}? A exclusão só vai para o GitHub quando você publicar.`, confirm: 'Excluir', danger: true })) return;
    const f = Tree.find(S.manifest(), node.id);
    const neighbor = f.list[f.list.indexOf(f.node) + 1] || f.list[f.list.indexOf(f.node) - 1] || f.parent;
    const wasInside = ed.sel === node.id || (ed.sel && Tree.pagesUnder(node).some((p) => p.id === ed.sel));
    ed.scheduleCommit.cancel();
    S.editManifest((m) => Tree.remove(m, node.id));
    ps.forEach((p) => S.deleteFile(pagePath(p.path)));
    if (wasInside) { ed.sel = null; ed.doc = null; await ed.select(neighbor?.id || Tree.pages(S.manifest())[0]?.id || null); }
  };
  ed.renamePath = async (node, newPath) => {
    newPath = newPath.trim().replace(/^\/+|\/+$/g, '').replace(/\.md$/, '');
    if (!/^[a-z0-9][a-z0-9-/]*$/.test(newPath)) { toast('Use só letras minúsculas, números, hífen e barras.', { type: 'error' }); return false; }
    if (newPath === node.path) return true;
    if (ed.pagePaths().has(newPath) || Tree.allPaths(S.manifest()).has(newPath)) { toast('Já existe uma página com esse endereço.', { type: 'error' }); return false; }
    ed.flush();
    const text = await S.readText(pagePath(node.path));
    S.setText(pagePath(newPath), text ?? ed.stubFile(node.label));
    S.deleteFile(pagePath(node.path));
    S.editManifest((m) => { const t = Tree.find(m, node.id).node; t.path = newPath; });
    if (ed.doc?.path === node.path) { ed.doc.path = newPath; history.replaceState(null, '', '#/editor/' + newPath); code.open(pagePath(newPath)); }
    return true;
  };
  ed.chooseIcon = async (node) => {
    const r = await pickIcon({ current: node.icon || (node.type === 'category' ? 'folder' : 'file-text'), color: node.iconColor || '', label: node.label });
    if (r) await ed.updateMeta(node, { icon: r.icon, iconColor: r.color });
  };
  ed.openPreview = () => {
    ed.flush();
    const n = ed.node(); if (!n || n.type !== 'page' || !ed.doc) { toast('Selecione uma página para pré-visualizar.'); return; }
    const { html } = renderMarkdown(ed.docMd(), { resolve: S.resolveUrl });
    const ov = h('div', { class: 'preview-over' },
      h('div', { class: 'bar' }, icon('eye', 16), h('span', { class: 'grow' }, 'Pré-visualização do rascunho — ainda não publicado'), h('button', { class: 'btn sm', onclick: () => ov.remove() }, 'Fechar')),
      h('main', { class: 'v-main' }, h('h1', { class: 'doc-title' }, ed.doc.fm.title || n.label), h('article', { class: 'prose', html })));
    document.body.append(ov);
    const esc = (e) => { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  };
  ed.openPublish = () => { ed.flush(); openPublish(ed); };

  // ───────── componentes ─────────
  const sidebar = createSidebar(ed);
  const visual = createVisual(ed);
  const panel = createPanel(ed);
  const code = createCode(ed);
  ed.sidebar = sidebar; ed.visual = visual; ed.panel = panel; ed.code = code;
  ed.afterDocCommit = () => code.syncFromStore();

  const canvas = h('div', { class: 'ed-canvas' });
  ed.renderBody = () => {
    clear(body);
    body.className = 'ed-body' + (ed.mode === 'code' ? ' code' : ed.mode === 'split' ? ' split' : '');
    if (ed.mode === 'code') body.append(code.explorer, code.editorCol, code.preview);
    else {
      renderCenter();
      body.append(sidebar.el, canvas);
      body.append(ed.mode === 'split' ? code.editorCol : panel.el);
    }
    if (ed.mode === 'code') code.render();
    else if (ed.mode === 'split') code.render();
  };
  function renderCenter() {
    const n = ed.node();
    clear(canvas);
    if (n?.type === 'page' && ed.doc) { visual.mount(canvas); ed.applyAccent(); }
    else if (n?.type === 'category') renderCategory(canvas, n);
    else canvas.append(h('div', { class: 'empty-state' }, icon('file-text', 32), h('b', {}, 'Nenhuma página selecionada'), h('p', {}, 'Escolha uma página na barra lateral ou crie uma nova.'), h('button', { class: 'btn primary', onclick: () => ed.createPage(null) }, icon('plus', 15), 'Nova página')));
  }
  function renderCategory(c, n) {
    const kids = n.items;
    c.append(h('div', { class: 'cat-view' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, h('span', { class: 'icon-tile' }, icon(n.icon || 'folder', 20, n.iconColor || 'currentColor')), h('div', { class: 'grow' }, h('h2', { style: { fontSize: '22px' } }, n.label), h('div', { class: 'muted small' }, `Seção · ${kids.length} item(ns)`))),
      kids.length ? kids.map((k) => h('button', { class: 'cat-card', onclick: () => ed.select(k.id) }, icon(k.icon || (k.type === 'category' ? 'folder' : 'file-text'), 18, k.iconColor || 'currentColor'), h('span', { class: 'grow' }, k.label), h('span', { class: 'muted small' }, k.type === 'category' ? 'seção' : 'página'))) : h('p', { class: 'muted' }, 'Esta seção ainda está vazia.'),
      h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn', onclick: () => ed.createPage(n.id) }, icon('plus', 14), 'Nova página'), h('button', { class: 'btn', onclick: () => ed.createCategory(n.id) }, icon('folder', 14), 'Nova subseção'))));
  }

  // ───────── barra superior ─────────
  const statusDot = h('span', { class: 'dot' });
  const statusTxt = h('span', {});
  const badge = h('span', { class: 'badge hidden' });
  const pubBtn = h('button', { class: 'btn primary', onclick: () => ed.openPublish() }, icon('upload', 15), 'Publicar', badge);
  const segBtns = [['visual', 'Visual', 'pen'], ['code', 'Código', 'code'], ['split', 'Dividido', 'split']].map(([k, label, ic]) =>
    h('button', { dataset: { mode: k }, onclick: () => ed.setMode(k) }, icon(ic, 14), label));
  const user = S.state.auth.user;
  const top = h('header', { class: 'ed-top' },
    h('div', { class: 'side' },
      h('a', { class: 'brand', href: '#/', title: 'Ver o site', style: { gap: '10px' } }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), 'Docs Studio'),
      h('span', { class: 'vsep' }),
      h('span', { class: 'chip', title: `Branch ${CONFIG.branch}` }, icon('branch', 14), `${CONFIG.owner}/${CONFIG.repo}`)),
    h('div', { class: 'seg', role: 'tablist' }, segBtns),
    h('div', { class: 'side r' },
      h('span', { class: 'sync' }, statusDot, statusTxt),
      h('button', { class: 'btn', onclick: () => ed.openPreview() }, icon('eye', 15), 'Pré-visualizar'),
      pubBtn,
      h('button', { class: 'icon-btn', 'aria-label': 'Conta', title: user.login, onclick: (e) => menu(e.currentTarget, [
        { label: `@${user.login}`, icon: 'github', onClick: () => window.open(`https://github.com/${user.login}`, '_blank', 'noopener') },
        { label: 'Ver o site', icon: 'external', onClick: () => { location.hash = '#/' + (ed.doc ? 'docs/' + ed.doc.path : ''); } },
        { label: 'Alternar tema', icon: 'moon', onClick: () => toggleTheme() },
        { sep: true },
        { label: 'Sair', icon: 'log-out', danger: true, onClick: () => { S.logout(); location.hash = '#/'; location.reload(); } },
      ], { align: 'right' }) }, user.avatar ? h('img', { class: 'avatar', src: user.avatar, alt: '' }) : icon('users', 18))));

  const body = h('div', { class: 'ed-body' });
  const status = h('footer', { class: 'statusbar' });
  root.append(h('div', { class: 'ed' }, top, body, status));

  ed.setMode = async (mode) => {
    ed.flush(); ed.mode = mode; LSset('hub.mode', mode);
    segBtns.forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    await ed.reloadDoc();
    ed.renderBody(); panel.render();
    if (ed.doc) code.open(pagePath(ed.doc.path));
  };

  // ───────── status e assinatura do store ─────────
  let lastManifest = S.textNow(MANIFEST_PATH);
  const refreshStatus = () => {
    const n = S.draftCount();
    badge.textContent = n; badge.classList.toggle('hidden', !n);
    statusDot.classList.toggle('amber', n > 0);
    statusTxt.textContent = n ? `${n} alteraç${n > 1 ? 'ões' : 'ão'} não publicada${n > 1 ? 's' : ''}` : 'Tudo publicado';
    clear(status);
    status.append(h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } }, icon('branch', 12, '#fff', 2.2), h('b', {}, CONFIG.branch)),
      h('span', {}, n ? `${n} arquivo(s) alterado(s)` : 'sem alterações'),
      ...(S.state.manifestError ? [h('span', { style: { color: '#fca5a5' } }, S.state.manifestError)] : []),
      h('span', { class: 'sp' }), h('span', {}, 'Rascunhos salvos neste navegador'), code.cursorInfo);
  };
  const unsub = S.subscribe(() => {
    refreshStatus();
    const t = S.textNow(MANIFEST_PATH);
    if (t !== lastManifest) { lastManifest = t; sidebar.render(); panel.render(); if (ed.node()?.type === 'category') renderCenter(); if (ed.sel && !ed.node()) ed.select(Tree.pages(S.manifest())[0]?.id || null); }
    panel.refreshSync();
  });
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ed.flush(); toast('Rascunho salvo neste navegador. Use Publicar para enviar ao GitHub.', { type: 'ok' }); }
  };
  document.addEventListener('keydown', onKey);
  const onHide = () => ed.flush();
  window.addEventListener('beforeunload', onHide);

  // ───────── início ─────────
  segBtns.forEach((b) => b.classList.toggle('on', b.dataset.mode === ed.mode));
  refreshStatus();
  const m = S.manifest();
  const first = (initialPath && Tree.findByPath(m, initialPath)) || Tree.find(m, LSget('hub.last') || '')?.node || Tree.pages(m)[0] || m.items[0] || null;
  ed.sel = first?.id || null;
  await ed.loadDoc(ed.node());
  ed.renderBody(); sidebar.render(); panel.render();
  if (ed.doc) code.open(pagePath(ed.doc.path)); else code.open(MANIFEST_PATH);
  return () => { unsub(); document.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onHide); ed.flush(); visual.destroy(); code.destroy(); };
}
