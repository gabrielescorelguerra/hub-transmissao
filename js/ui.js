// Utilitários de interface (sem dependências).
import { motionOn } from './motion.js';
import { iconHtml, ICON_COLORS } from './icons.js';

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function icon(name, size = 16, color = 'currentColor', sw = 2) {
  const s = h('span', { class: 'ic', html: iconHtml(name, size, color, sw) });
  s.style.width = s.style.height = size + 'px';
  return s;
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const $ = (sel, root = document) => root.querySelector(sel);

// ───────────── Toast ─────────────
export function toast(msg, { type = 'info', ms = 4200, href, label } = {}) {
  let box = $('#toasts'); if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: `toast ${type}` }, icon(type === 'error' ? 'alert' : type === 'ok' ? 'check' : 'info', 16), h('span', {}, msg),
    href ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label || 'Abrir') : null);
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, ms);
  return t;
}

// ───────────── Modal ─────────────
export function modal({ title, sub, body, footer, width = 560, onClose, className = '' }) {
  const prevFocus = document.activeElement;
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey, true); prevFocus?.focus?.(); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const x = h('button', { class: 'icon-btn', 'aria-label': 'Fechar', onclick: close }, icon('x', 16));
  const card = h('div', { class: `modal ${className}`, style: { width: `min(${width}px, calc(100vw - 32px))` }, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('div', { class: 'grow' }, h('h2', {}, title), sub ? h('p', { class: 'muted' }, sub) : null), x),
    h('div', { class: 'modal-body' }, body),
    footer ? h('div', { class: 'modal-foot' }, footer) : null);
  const ov = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === ov) close(); } }, card);
  document.body.append(ov);
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => (card.querySelector('[autofocus]') || card.querySelector('input,button,textarea'))?.focus(), 0);
  return { el: card, close };
}

export function ask({ title, message, input, value = '', placeholder = '', confirm = 'Confirmar', danger = false, cancel = 'Cancelar' }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; m.close(); resolve(v); };
    const field = input ? h('input', { class: 'input', value, placeholder, autofocus: true, onkeydown: (e) => { if (e.key === 'Enter') finish(field.value.trim() || null); } }) : null;
    const m = modal({
      title, width: 420, onClose: () => { if (!done) { done = true; resolve(input ? null : false); } },
      body: [message ? h('p', { class: 'muted', style: { margin: '0 0 12px' } }, message) : null, field],
      footer: [h('button', { class: 'btn', onclick: () => finish(input ? null : false) }, cancel),
        h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => finish(input ? field.value.trim() || null : true) }, confirm)],
    });
    if (field) setTimeout(() => field.select(), 10);
  });
}

// ───────────── Menu flutuante ─────────────
let openMenu = null;
export function closeMenu() { openMenu?.(); openMenu = null; }

export function menu(anchor, items, { align = 'left', cls = '' } = {}) {
  closeMenu();
  const el = h('div', { class: `menu ${cls}`, role: 'menu' }, items.map((it) => it.sep ? h('div', { class: 'menu-sep' }) :
    h('button', { class: `menu-item${it.danger ? ' danger' : ''}${it.active ? ' active' : ''}`, role: 'menuitem', onclick: (e) => { e.stopPropagation(); closeMenu(); it.onClick?.(); } },
      it.icon ? icon(it.icon, 15) : h('span', { class: 'ic', style: { width: '15px' } }), h('span', { class: 'grow' }, it.label), it.hint ? h('span', { class: 'muted small' }, it.hint) : null)));
  document.body.append(el);
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0, height: 0 };
  const w = el.offsetWidth, hh = el.offsetHeight;
  let left = align === 'right' ? r.right - w : r.left;
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = r.bottom + 4; if (top + hh > innerHeight - 8) top = Math.max(8, r.top - hh - 4);
  Object.assign(el.style, { left: left + 'px', top: top + 'px' });
  const off = (e) => { if (!el.contains(e.target)) closeMenu(); };
  const key = (e) => { if (e.key === 'Escape') closeMenu(); };
  setTimeout(() => { document.addEventListener('mousedown', off, true); document.addEventListener('keydown', key, true); }, 0);
  openMenu = () => { el.remove(); document.removeEventListener('mousedown', off, true); document.removeEventListener('keydown', key, true); };
  return el;
}

// ───────────── Tema ─────────────
export function applyTheme(t) {
  const theme = t || (() => { try { return localStorage.getItem('hub.theme'); } catch { return null; } })()
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  return theme;
}
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('hub.theme', next); } catch { /* ignora */ }
  return applyTheme(next);
}

export const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; d.cancel = () => clearTimeout(t); return d; };

// ───────────── Cores ─────────────
/** Seletor de cor: paleta + cor livre + "padrão". `onChange(hex|'')`. */
export function colorField(value, onChange, { live = true } = {}) {
  const wrap = h('div', { class: 'color-field' });
  const draw = () => {
    clear(wrap);
    ICON_COLORS.forEach((c) => wrap.append(h('button', { type: 'button', class: `swatch${c.toLowerCase() === (value || '').toLowerCase() ? ' on' : ''}`, title: c || 'Padrão', 'aria-label': c || 'Cor padrão', onclick: () => { value = c; onChange(c); draw(); } }, h('i', { style: { background: c || 'var(--muted)' } }))));
    const custom = h('input', { type: 'color', class: 'color-custom', 'aria-label': 'Cor personalizada', value: /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#3d6bf2', [live ? 'oninput' : 'onchange']: (e) => { value = e.target.value.toUpperCase(); onChange(value); wrap.querySelectorAll('.swatch.on').forEach((x) => x.classList.remove('on')); } });
    wrap.append(custom);
  };
  draw();
  return wrap;
}

/** Popover genérico ancorado em um elemento. */
export function popover(anchor, content) {
  closeMenu();
  const el = h('div', { class: 'menu pop', role: 'dialog' }, content);
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, hh = el.offsetHeight;
  let top = r.bottom + 6; if (top + hh > innerHeight - 8) top = Math.max(8, r.top - hh - 6);
  Object.assign(el.style, { left: Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px', top: top + 'px' });
  const off = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
  const key = (e) => { if (e.key === 'Escape') closeMenu(); };
  setTimeout(() => { document.addEventListener('mousedown', off, true); document.addEventListener('keydown', key, true); }, 0);
  openMenu = () => { el.remove(); document.removeEventListener('mousedown', off, true); document.removeEventListener('keydown', key, true); };
  return el;
}
export function pickColor(anchor, value, onChange) { return popover(anchor, h('div', { style: { padding: '8px' } }, h('div', { class: 'label', style: { marginBottom: '8px' } }, 'Cor'), colorField(value, onChange))); }

// ───────────── Transições de tela (View Transitions API, com fallback) ─────────────
export const prefersReduced = () => !motionOn();
