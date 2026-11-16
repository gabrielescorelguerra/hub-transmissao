import { applyTheme, $, h, toast, withTransition, prefersReduced } from './ui.js';
import * as S from './store.js';
import { createShell } from './shell.js';

applyTheme();
const app = $('#app');
const shell = createShell(app);
let current = null;          // elemento da tela atual
let cleanup = null;
let viewer = null;           // casca persistente do site de leitura (navegar entre páginas só troca o conteúdo)
let seq = 0;

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [area, ...rest] = raw.split('/');
  if (['editor', 'docs', 'checklist', 'mensagens', 'login'].includes(area)) return { area, path: rest.join('/') };
  return { area: 'docs', path: '' };
}

async function mountArea(r, root, ctx, my) {
  if (!S.state.auth) await S.resume();
  const loginThen = async (then) => { const { mountLogin } = await import('./login.js'); return { cleanup: mountLogin(root, then), bare: true }; };
  if (r.area === 'login') {
    if (S.state.auth) { location.replace('#/' + (r.path || '')); return null; }
    return loginThen(() => { location.hash = '#/' + (r.path || ''); });
  }
  if (r.area === 'checklist' || r.area === 'mensagens') {
    const { mountList } = await import('./lists.js');
    return { cleanup: await mountList(root, r.area, ctx) };
  }
  if (r.area === 'editor') {
    if (!S.state.auth) return loginThen(() => route());
    const { mountEditor } = await import('./editor/app.js');
    return { cleanup: await mountEditor(root, r.path), bare: true };
  }
  const { mountViewer } = await import('./viewer.js');
  const v = await mountViewer(root, r.path, ctx);
  return { cleanup: v.cleanup, viewer: v.live ? v : null };
}

async function route() {
  const my = ++seq;
  const r = parseHash();
  const tab = ['docs', 'checklist', 'mensagens'].includes(r.area) ? r.area : null;
  shell.setActive(tab);                     // a aba já desliza enquanto a tela carrega
  if (r.area === 'docs' && viewer && r.path) {
    try { await viewer.update(r.path); } catch (e) { console.error(e); toast(e.message || 'Erro ao abrir a página', { type: 'error' }); }
    return;
  }
  // monta a nova tela "nos bastidores"; a antiga fica visível até a nova estar pronta
  const next = h('div', { class: 'view staging' });
  shell.view.append(next);
  const slow = setTimeout(() => shell.loading(true), 160);
  const ctx = { brand: '', search: null, action: null, menu: null };
  let res = null;
  try { res = await mountArea(r, next, ctx, my); }
  catch (e) {
    console.error(e);
    next.replaceChildren(h('div', { class: 'v-empty' }, h('h2', {}, 'Não foi possível carregar'), h('p', {}, e.message || String(e)), h('p', {}, h('a', { href: '#/' }, 'Voltar ao início'))));
    toast(e.message || 'Erro inesperado', { type: 'error' });
    res = { cleanup: null, bare: false };
  }
  clearTimeout(slow);
  if (my !== seq || !res) { try { res?.cleanup?.(); } catch { /* ignora */ } next.remove(); if (my === seq) shell.loading(false); return; }

  const old = current, oldCleanup = cleanup;
  const swap = () => {
    try { oldCleanup?.(); } catch (e) { console.error(e); }
    old?.remove();
    next.classList.remove('staging'); next.classList.toggle('bare', !!res.bare);
    shell.setHidden(!!res.bare); shell.apply(ctx);
    current = next; cleanup = res.cleanup; viewer = res.viewer || null;
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  shell.loading(false);
  if (!old || prefersReduced()) { swap(); return; }
  old.style.viewTransitionName = 'view';
  await withTransition(() => { old.style.viewTransitionName = ''; next.style.viewTransitionName = 'view'; swap(); });
  next.style.viewTransitionName = '';
}

window.addEventListener('hashchange', route);
route();
