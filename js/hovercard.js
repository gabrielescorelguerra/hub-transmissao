// Pré-visualização ao passar o mouse sobre um link para uma página (como no Obsidian).
import { h } from './ui.js';
import * as S from './store.js';
import { renderMarkdown } from './md.js';

let card = null, showT = 0, hideT = 0, current = null;

function hide() { clearTimeout(showT); card?.remove(); card = null; current = null; }
const scheduleHide = () => { clearTimeout(showT); clearTimeout(hideT); hideT = setTimeout(hide, 220); };

async function show(anchor, path, label) {
  const page = await S.loadPage(path).catch(() => null);
  if (current !== anchor || !page) return;
  card?.remove();
  const { html } = renderMarkdown(page.body, { resolve: S.resolveUrl });
  card = h('div', { class: 'hovercard', role: 'tooltip' },
    h('div', { class: 'hc-head' }, h('b', {}, page.fm.title || label || path), h('a', { href: '#/docs/' + path, onclick: hide }, 'Abrir ↗')),
    h('div', { class: 'hc-body prose', html }));
  card.addEventListener('mouseenter', () => clearTimeout(hideT));
  card.addEventListener('mouseleave', scheduleHide);
  document.body.append(card);
  const r = anchor.getBoundingClientRect();
  const w = card.offsetWidth, hh = card.offsetHeight;
  let top = r.bottom + 8; if (top + hh > innerHeight - 8) top = Math.max(8, r.top - hh - 8);
  const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
  Object.assign(card.style, { left: left + 'px', top: top + 'px' });
}

const isTouch = () => matchMedia('(hover: none)').matches;
let sheet = null;
export function closeSheet() { sheet?.remove(); sheet = null; }
async function openSheet(path, label) {
  closeSheet();
  const body = h('div', { class: 'hc-body prose' }, h('p', { class: 'muted' }, 'Carregando…'));
  const close = () => { const el = sheet; if (!el) return; el.classList.remove('open'); setTimeout(() => el.remove(), 220); sheet = null; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const el = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === el) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': label || 'Prévia do tutorial' },
      h('div', { class: 'sheet-grip' }),
      h('div', { class: 'hc-head' }, h('b', { class: 'grow' }, label || path), h('a', { class: 'btn primary sm', href: '#/docs/' + path, onclick: close }, 'Abrir página'), h('button', { class: 'icon-btn', 'aria-label': 'Fechar', onclick: close }, '✕')),
      body));
  document.body.append(el); sheet = el; document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => el.classList.add('open'));
  const page = await S.loadPage(path).catch(() => null);
  if (!page) { body.textContent = 'Não foi possível carregar este tutorial.'; return; }
  const { html } = renderMarkdown(page.body, { resolve: S.resolveUrl });
  body.innerHTML = html;
}

export function attachPreview(el, path, label, { sheet: useSheet = false } = {}) {
  if (useSheet) el.addEventListener('click', (e) => { if (isTouch()) { e.preventDefault(); e.stopPropagation(); hide(); openSheet(path, label); } });
  const start = () => { if (isTouch()) return; clearTimeout(hideT); clearTimeout(showT); if (current === el && card) return; current = el; showT = setTimeout(() => show(el, path, label), 280); };
  el.addEventListener('mouseenter', start);
  el.addEventListener('focus', start);
  el.addEventListener('mouseleave', scheduleHide);
  el.addEventListener('blur', scheduleHide);
}
export const hidePreview = hide;
