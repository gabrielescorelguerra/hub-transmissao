// Páginas "Checklist" e "Mensagens da transmissão": leitura para todos, edição para quem fez login.
import { h, icon, clear, toast, ask, pickColor, closeMenu } from './ui.js';
import { pickIcon } from './editor/iconpicker.js';
import { attachPreview } from './hovercard.js';
import { docPickerButton, resolveRef } from './editor/docpicker.js';
import { CONFIG } from './config.js';
import * as S from './store.js';
import * as Tree from './tree.js';

const CFG = {
  checklist: {
    path: 'content/checklist.json', title: 'Checklist do culto', key: 'sections', itemKey: 'items',
    sub: 'Procedimentos a realizar antes, durante e depois do culto.',
    empty: { title: 'Checklist do culto', sections: [{ id: 's1', title: 'Antes do culto', items: [{ id: 'i1', text: 'Ligar e testar câmeras', note: '', doc: '' }, { id: 'i2', text: 'Conferir internet e chave de transmissão', note: '', doc: '' }] }, { id: 's2', title: 'Durante o culto', items: [{ id: 'i3', text: 'Monitorar áudio e vídeo', note: '', doc: '' }] }, { id: 's3', title: 'Depois do culto', items: [{ id: 'i4', text: 'Encerrar a transmissão', note: '', doc: '' }] }] },
  },
  mensagens: {
    path: 'content/mensagens.json', title: 'Mensagens da transmissão', key: 'groups', itemKey: 'messages',
    sub: 'Mensagens para enviar durante a transmissão. Use o botão Copiar.',
    empty: { title: 'Mensagens da transmissão', groups: [{ id: 'g1', title: 'Abertura', messages: [{ id: 'm1', title: 'Boas-vindas', text: 'Olá! Sejam bem-vindos à nossa transmissão. Que Deus abençoe a todos! 🙏' }] }] },
  },
};
const uid = () => Math.random().toString(36).slice(2, 8);
const LS = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } } };

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = h('textarea', { style: { position: 'fixed', opacity: 0 } }); t.value = text; document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignora */ } t.remove(); return ok;
  }
}

export async function mountList(root, kind, ctx = {}) {
  const C = CFG[kind];
  const m = await S.loadManifest();
  const load = async () => { const t = await S.readText(C.path); try { return t ? JSON.parse(t) : structuredClone(C.empty); } catch { return structuredClone(C.empty); } };
  let data = await load();
  const logged = () => !!S.state.auth;
  let editing = false;
  const ticksKey = 'hub.ticks.' + CONFIG.repo;
  const ticks = new Set(JSON.parse(LS.get(ticksKey) || '[]'));
  const foldKey = 'hub.fold.' + CONFIG.repo;
  const folded = new Set(JSON.parse(LS.get(foldKey) || '[]'));
  const save = () => S.setText(C.path, JSON.stringify(data, null, 2) + '\n');

  const edBtn = logged() ? h('button', { class: 'btn sm', onclick: () => { editing = !editing; render(); } }, icon('pen', 14), 'Editar')
    : h('a', { class: 'btn ghost sm', href: '#/login/' + kind }, 'Entrar');
  ctx.brand = m.title || CONFIG.siteName; ctx.action = edBtn;
  const main = h('main', { class: 'l-main' });
  root.append(main);

  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); render(); };
  const tool = (ic, label, fn, cls = '') => h('button', { class: `icon-btn ${cls}`, title: label, 'aria-label': label, style: { width: '28px', height: '28px' }, onclick: fn }, icon(ic, 14));
  const del = async (arr, i, what) => { if (await ask({ title: 'Excluir', message: `Excluir ${what}?`, confirm: 'Excluir', danger: true })) { arr.splice(i, 1); save(); render(); } };
  const input = (val, ph, on, extra = {}) => h('input', { class: 'input', value: val || '', placeholder: ph, 'aria-label': ph, oninput: (e) => on(e.target.value), onchange: () => save(), ...extra });
  const accentOf = (el, color) => { if (color) { el.classList.add('accent-scope', 'colored'); el.style.setProperty('--accent', color); } return el; };
  const iconBtn = (obj, fallback, label) => h('button', { class: 'icon-btn', title: 'Ícone e cor', 'aria-label': `Ícone e cor de ${label}`, style: { width: '34px', height: '34px', background: obj.color ? `color-mix(in srgb, ${obj.color} 14%, transparent)` : 'var(--hover)' },
    onclick: async () => { const r = await pickIcon({ current: obj.icon || fallback, color: obj.color || '', label }); if (r) { obj.icon = r.icon; obj.color = r.color; save(); render(); } } }, icon(obj.icon || fallback, 18, obj.color || 'currentColor'));
  const headIcon = (obj, fallback) => h('span', { class: 'ic', style: { width: '20px', height: '20px' } }, icon(obj.icon || fallback, 19, obj.color ? 'var(--accent-text)' : 'currentColor'));

  function renderChecklist() {
    data.sections.forEach((sec, si) => {
      const real = () => sec.items.filter((i) => i.type !== 'subtitle');
      const countDone = () => real().filter((i) => ticks.has(i.id)).length;
      const total = () => real().length;
      const done = countDone();
      const barFill = h('i', { style: { width: total() ? (done / total() * 100) + '%' : '0%' } });
      const countTxt = h('span', {}, `${done}/${total()}`);
      const updateProg = () => { const d = countDone(); barFill.style.width = total() ? (d / total() * 100) + '%' : '0%'; countTxt.textContent = `${d}/${total()}`; };
      const box = accentOf(h('section', { class: 'l-sec' }), sec.color);
      const head = h('header', {});
      if (editing) head.append(iconBtn(sec, 'list', sec.title), h('div', { class: 'grow' }, input(sec.title, 'Nome da seção', (v) => { sec.title = v; })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir seção', () => move(data.sections, si, -1)), tool('arrow-down', 'Descer seção', () => move(data.sections, si, 1)), tool('trash', 'Excluir seção', () => del(data.sections, si, `a seção "${sec.title}"`), 'danger')));
      else {
        const isClosed = folded.has(sec.id);
        head.classList.add('l-fold-head'); head.tabIndex = 0; head.setAttribute('role', 'button'); head.setAttribute('aria-expanded', String(!isClosed));
        head.append(h('span', { class: 'l-chev ic' }, icon('chev-d', 16)), headIcon(sec, 'list'), h('span', { class: 'sec-title' }, sec.title), h('span', { class: 'prog' }, h('span', { class: 'prog-bar' }, barFill), countTxt));
        const flip = () => { const c = !box.classList.contains('closed'); box.classList.toggle('closed', c); head.setAttribute('aria-expanded', String(!c)); c ? folded.add(sec.id) : folded.delete(sec.id); LS.set(foldKey, JSON.stringify([...folded])); body.inert = c; };
        head.addEventListener('click', flip);
        head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
        if (isClosed) box.classList.add('closed');
      }
      const inner = h('div', { class: 'l-fold-in' });
      const body = h('div', { class: 'l-fold' }, inner);
      body.inert = !editing && folded.has(sec.id);
      box.append(head, body);
      sec.items.forEach((it, ii) => {
        if (it.type === 'subtitle') {
          const sub = h('div', { class: 'l-sub' });
          if (editing) sub.append(h('div', { class: 'grow' }, input(it.text, 'Subtítulo', (v) => { it.text = v; }, { style: { fontWeight: 600 } })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir', () => move(sec.items, ii, -1)), tool('arrow-down', 'Descer', () => move(sec.items, ii, 1)), tool('trash', 'Excluir subtítulo', () => del(sec.items, ii, 'este subtítulo'), 'danger')));
          else sub.append(h('span', {}, it.text || 'Subtítulo'));
          inner.append(sub); return;
        }
        const row = h('div', { class: `l-item${!editing && ticks.has(it.id) ? ' done' : ''}` });
        if (editing) {
          row.append(h('div', { class: 'l-edit' }, input(it.text, 'Procedimento', (v) => { it.text = v; }), h('div', { class: 'row' }, input(it.note, 'Observação (opcional)', (v) => { it.note = v; }, { style: { flex: 1, minWidth: '160px', height: '32px' } }), docPickerButton(m, it.doc, (v) => { it.doc = v; save(); }))),
            h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir', () => move(sec.items, ii, -1)), tool('arrow-down', 'Descer', () => move(sec.items, ii, 1)), tool('trash', 'Excluir item', () => del(sec.items, ii, 'este item'), 'danger')));
        } else {
          const doc = resolveRef(m, it.doc);
          const mark = h('span', { class: 'cbx', 'aria-hidden': 'true' }, null);
          mark.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          row.classList.add('l-click'); row.tabIndex = 0; row.setAttribute('role', 'checkbox'); row.setAttribute('aria-label', it.text);
          const paint = (v) => { row.classList.toggle('done', v); row.setAttribute('aria-checked', String(v)); };
          paint(ticks.has(it.id));
          const toggle = () => { const v = !ticks.has(it.id); v ? ticks.add(it.id) : ticks.delete(it.id); LS.set(ticksKey, JSON.stringify([...ticks])); paint(v); updateProg(); navigator.vibrate?.(8); };
          row.addEventListener('click', (e) => { if (e.target.closest('a')) return; toggle(); });
          row.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && e.target === row) { e.preventDefault(); toggle(); } });
          row.append(mark, h('div', { class: 'l-text' }, it.text, it.note ? h('div', { class: 'l-note' }, it.note) : null));
          if (doc && doc.href) { const dc = doc.color; const a = h('a', { class: `l-doc${doc.kind === 'folder' ? ' folder' : ''}`, href: doc.href, style: dc ? { background: `color-mix(in srgb, ${dc} 14%, transparent)`, color: dc } : {} }, icon(doc.kind === 'folder' ? (doc.node.icon || 'folder') : 'book', 13, dc || 'currentColor'), doc.label, doc.kind === 'folder' ? h('small', {}, `${doc.count}`) : null); if (doc.kind === 'page') attachPreview(a, it.doc, doc.label, { sheet: true }); row.append(a); }
        }
        inner.append(row);
      });
      if (editing) inner.append(h('div', { class: 'l-addrow' },
        h('button', { class: 'dashed l-add', onclick: () => { sec.items.push({ id: uid(), text: '', note: '', doc: '' }); save(); render(); } }, icon('plus', 14), 'Adicionar item'),
        h('button', { class: 'dashed l-add', onclick: () => { sec.items.push({ id: uid(), type: 'subtitle', text: 'Novo subtítulo' }); save(); render(); } }, icon('plus', 14), 'Adicionar subtítulo')));
      main.append(box);
    });
    if (editing) main.append(h('button', { class: 'dashed', onclick: () => { data.sections.push({ id: uid(), title: 'Nova seção', items: [] }); save(); render(); } }, icon('plus', 14), 'Nova seção'));
  }

  function renderMessages() {
    data.groups.forEach((g, gi) => {
      const box = accentOf(h('section', { class: 'l-sec' }), g.color);
      const head = h('header', {});
      if (editing) head.append(iconBtn(g, 'mail', g.title), h('div', { class: 'grow' }, input(g.title, 'Nome do grupo', (v) => { g.title = v; })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir grupo', () => move(data.groups, gi, -1)), tool('arrow-down', 'Descer grupo', () => move(data.groups, gi, 1)), tool('trash', 'Excluir grupo', () => del(data.groups, gi, `o grupo "${g.title}"`), 'danger')));
      else head.append(headIcon(g, 'mail'), h('span', { class: 'sec-title' }, g.title));
      const grid = h('div', { class: 'msg-grid' });
      g.messages.forEach((msg, mi) => {
        const card = h('div', { class: 'msg-card' });
        if (editing) {
          const ta = h('textarea', { class: 'input', rows: 4, 'aria-label': 'Texto da mensagem', oninput: (e) => { msg.text = e.target.value; }, onchange: () => save() }); ta.value = msg.text || '';
          card.append(h('div', { class: 'top' }, h('div', { class: 'grow' }, input(msg.title, 'Título da mensagem', (v) => { msg.title = v; })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir', () => move(g.messages, mi, -1)), tool('arrow-down', 'Descer', () => move(g.messages, mi, 1)), tool('trash', 'Excluir mensagem', () => del(g.messages, mi, 'esta mensagem'), 'danger'))), ta);
        } else {
          const b = h('button', { class: 'btn primary sm copy-btn', onclick: async () => { const ok = await copy(msg.text || ''); toast(ok ? 'Mensagem copiada!' : 'Não foi possível copiar.', { type: ok ? 'ok' : 'error', ms: 1800 }); b.replaceChildren(icon('check', 14), 'Copiado'); setTimeout(() => b.replaceChildren(icon('copy', 14), 'Copiar'), 1500); } }, icon('copy', 14), 'Copiar');
          card.append(h('div', { class: 'top' }, h('h3', {}, msg.title), b), h('div', { class: 'msg-text' }, msg.text));
        }
        grid.append(card);
      });
      if (editing) grid.append(h('button', { class: 'dashed', onclick: () => { g.messages.push({ id: uid(), title: 'Nova mensagem', text: '' }); save(); render(); } }, icon('plus', 14), 'Adicionar mensagem'));
      box.append(head, grid); main.append(box);
    });
    if (editing) main.append(h('button', { class: 'dashed', onclick: () => { data.groups.push({ id: uid(), title: 'Novo grupo', messages: [] }); save(); render(); } }, icon('plus', 14), 'Novo grupo'));
  }

  let rendered = false;
  function render() {
    const y = scrollY; clear(main);
    main.classList.toggle('noanim', rendered); rendered = true;
    if (logged()) edBtn.replaceChildren(icon(editing ? 'check' : 'pen', 14), editing ? 'Concluir edição' : 'Editar');
    const titleEl = editing ? input(data.title, 'Título da página', (v) => { data.title = v; }, { style: { fontSize: '22px', fontWeight: 700, height: '42px', maxWidth: '420px' } }) : h('h1', {}, data.title || C.title);
    const head = accentOf(h('div', { class: 'l-head' }, titleEl), data.color);
    if (data.color) head.classList.remove('colored');
    if (editing) head.append(h('button', { class: 'btn sm', onclick: (e) => pickColor(e.currentTarget, data.color || '', (c) => { data.color = c; save(); closeMenu(); render(); }) }, h('i', { style: { width: '12px', height: '12px', borderRadius: '50%', background: data.color || 'var(--muted)', display: 'inline-block' } }), 'Cor do título'));
    if (!editing && kind === 'checklist') head.append(h('span', { class: 'grow' }), h('button', { class: 'btn sm', onclick: () => { ticks.clear(); LS.set(ticksKey, '[]'); main.querySelectorAll('.l-item.done').forEach((r) => { r.classList.remove('done'); r.setAttribute('aria-checked', 'false'); }); main.querySelectorAll('.l-sec').forEach((sec) => { sec.querySelector('.prog-bar i') && (sec.querySelector('.prog-bar i').style.width = '0%'); const t = sec.querySelector('.prog > span:last-child'); if (t) t.textContent = t.textContent.replace(/^\d+/, '0'); }); } }, 'Limpar marcações'));
    main.append(head, h('p', { class: 'muted', style: { marginTop: '-12px' } }, C.sub));
    if (!(data[C.key] || []).length && !editing) main.append(h('div', { class: 'v-empty' }, 'Nada por aqui ainda.'));
    (kind === 'checklist' ? renderChecklist : renderMessages)();
    if (editing) {
      const n = S.draftCount();
      main.append(h('div', { class: 'edit-bar' }, icon('pen', 14, '#fff'), h('span', { class: 'small' }, n ? `${n} alteração(ões) não publicada(s)` : 'Sem alterações'),
        h('button', { class: 'btn primary', onclick: publish }, icon('upload', 14), 'Publicar')));
    }
    scrollTo(0, y);
  }
  async function publish() {
    if (data.title !== undefined) save();
    const { openPublish } = await import('./editor/publish.js');
    await openPublish({ flush() {}, reloadDoc: async () => {}, sidebar: { render() {} } });
    data = await load(); render();
  }
  render();
  return () => {};
}
