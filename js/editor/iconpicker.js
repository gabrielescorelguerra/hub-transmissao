import { h, icon, modal, colorField } from '../ui.js';
import { pickerIcons, ICON_COLORS, CATEGORIES } from '../icons.js';

const EMOJIS = ['📄', '📘', '📷', '🎥', '📡', '🌐', '🔒', '⚙️', '🛠️', '💡', '⭐', '🚀', '🔔', '📌', '📁', '🖥️', '📱', '🎙️', '🎧', '📶', '🧩', '🧰', '✅', '⚠️', '❓', '🔗', '📊', '🗂️', '👥', '🏠'];

/** Abre o seletor de ícones. Resolve com {icon, color} ou null. */
export function pickIcon({ current = 'file-text', color = '', label = '' }) {
  return new Promise((resolve) => {
    let sel = current, col = color, cat = 'Todos', q = '', tab = current.startsWith('emoji:') ? 'emoji' : 'icones', done = false;
    const all = pickerIcons();
    const finish = (v) => { if (done) return; done = true; m.close(); resolve(v); };
    const body = h('div', { class: 'stack' });
    const grid = h('div', { class: 'picker-grid' });
    const preview = h('span', { class: 'icon-tile' });
    const search = h('input', { class: 'input', placeholder: 'Buscar ícone…', 'aria-label': 'Buscar ícone', oninput: (e) => { q = e.target.value.toLowerCase(); renderGrid(); } });
    const cats = h('div', { class: 'cats' });
    const swatches = h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } });
    const tabs = h('div', { class: 'pill-seg', style: { alignSelf: 'flex-start' } });

    const renderPreview = () => { preview.replaceChildren(icon(sel, 22, col || 'currentColor')); };
    const renderGrid = () => {
      grid.replaceChildren();
      if (tab === 'emoji') {
        grid.className = 'emoji-grid';
        EMOJIS.forEach((e) => grid.append(h('button', { type: 'button', 'aria-label': e, onclick: () => { sel = 'emoji:' + e; renderPreview(); } }, e)));
        return;
      }
      grid.className = 'picker-grid';
      const list = all.filter((i) => (cat === 'Todos' || i.cat === cat) && (!q || i.tags.includes(q)));
      if (!list.length) grid.append(h('p', { class: 'muted', style: { gridColumn: '1/-1' } }, 'Nenhum ícone encontrado.'));
      list.forEach((i) => grid.append(h('button', { type: 'button', class: `picker-cell${i.name === sel ? ' on' : ''}`, title: i.name, 'aria-label': i.name, onclick: () => { sel = i.name; renderPreview(); renderGrid(); } }, icon(i.name, 22, col || 'currentColor'))));
    };
    const renderChrome = () => {
      tabs.replaceChildren(...[['icones', 'Ícones'], ['emoji', 'Emoji']].map(([k, l]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; renderChrome(); renderGrid(); } }, l)));
      cats.replaceChildren(...(tab === 'icones' ? CATEGORIES.map((c) => h('button', { type: 'button', class: c === cat ? 'on' : '', onclick: () => { cat = c; renderChrome(); renderGrid(); } }, c)) : []));
      search.classList.toggle('hidden', tab !== 'icones');
      swatches.replaceChildren(h('span', { class: 'label' }, 'Cor'), colorField(col, (c) => { col = c; renderPreview(); renderGrid(); }));
      swatches.classList.toggle('hidden', tab !== 'icones');
    };
    body.append(h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, preview, h('div', { class: 'grow' }, search), tabs), cats, grid, swatches);
    const m = modal({
      title: 'Escolher ícone', sub: label ? `Para "${label}"` : '', body, width: 620, onClose: () => { if (!done) { done = true; resolve(null); } },
      footer: [h('span', { class: 'muted small grow' }, 'Dica: use cores para diferenciar seções.'), h('button', { class: 'btn', onclick: () => finish(null) }, 'Cancelar'), h('button', { class: 'btn primary', onclick: () => finish({ icon: sel, color: col }) }, 'Aplicar')],
    });
    renderChrome(); renderPreview(); renderGrid();
  });
}
