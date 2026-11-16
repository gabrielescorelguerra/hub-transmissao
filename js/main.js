import { applyTheme, $, clear, h, toast } from './ui.js';
import * as S from './store.js';

applyTheme();
const app = $('#app');
let cleanup = null;
let viewer = null;   // casca persistente do site de leitura
let seq = 0;

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [area, ...rest] = raw.split('/');
  if (area === 'editor') return { area: 'editor', path: rest.join('/') };
  if (area === 'docs') return { area: 'docs', path: rest.join('/') };
  if (area === 'checklist' || area === 'mensagens' || area === 'login') return { area, path: rest.join('/') };
  return { area: 'docs', path: '' };
}

async function route() {
  const my = ++seq;
  const r = parseHash();
  if (r.area === 'docs' && viewer && r.path) {   // navegação dentro da documentação: só troca o conteúdo
    try { await viewer.update(r.path); } catch (e) { console.error(e); toast(e.message || 'Erro ao abrir a página', { type: 'error' }); }
    return;
  }
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null; viewer = null;
  clear(app);
  app.append(h('div', { class: 'v-empty' }, 'Carregando…'));
  try {
    if (!S.state.auth) await S.resume();
    if (r.area === 'login') {
      const { mountLogin } = await import('./login.js');
      if (my !== seq) return;
      if (S.state.auth) { location.replace('#/' + (r.path || '')); return; }
      clear(app); cleanup = mountLogin(app, () => { location.hash = '#/' + (r.path || ''); }); return;
    }
    if (r.area === 'checklist' || r.area === 'mensagens') {
      const { mountList } = await import('./lists.js');
      if (my !== seq) return;
      clear(app); cleanup = await mountList(app, r.area); return;
    }
    if (r.area === 'editor') {
      if (!S.state.auth) {
        const { mountLogin } = await import('./login.js');
        if (my !== seq) return;
        clear(app); cleanup = mountLogin(app, () => route()); return;
      }
      const { mountEditor } = await import('./editor/app.js');
      if (my !== seq) return;
      clear(app); cleanup = await mountEditor(app, r.path);
    } else {
      const { mountViewer } = await import('./viewer.js');
      if (my !== seq) return;
      clear(app); const v = await mountViewer(app, r.path); viewer = v.live ? v : null; cleanup = v.cleanup;
    }
  } catch (e) {
    console.error(e);
    clear(app);
    app.append(h('div', { class: 'v-empty' }, h('h2', {}, 'Não foi possível carregar'), h('p', {}, e.message || String(e)), h('p', {}, h('a', { href: '#/' }, 'Voltar ao início'))));
    toast(e.message || 'Erro inesperado', { type: 'error' });
  }
}

window.addEventListener('hashchange', route);
route();
