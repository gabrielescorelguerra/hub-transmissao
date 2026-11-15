// Páginas "Checklist" e "Mensagens da transmissão": leitura para todos, edição para quem fez login.
import { h, icon, clear, toast, ask, toggleTheme } from './ui.js';
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

export async function mountList(root, kind) {
  const C = CFG[kind];
  const m = await S.loadManifest();
  const load = async () => { const t = await S.readText(C.path); try { return t ? JSON.parse(t) : structuredClone(C.empty); } catch { return structuredClone(C.empty); } };
  let data = await load();
  const logged = () => !!S.state.auth;
  let editing = false;
  const ticksKey = 'hub.ticks.' + CONFIG.repo;
  const ticks = new Set(JSON.parse(LS.get(ticksKey) || '[]'));
  const pages = Tree.pages(m).filter((p) => !p.hidden);
  const save = () => S.setText(C.path, JSON.stringify(data, null, 2) + '\n');

  const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Alternar tema', onclick: () => { toggleTheme(); } }, icon('moon', 18));
  const top = h('header', { class: 'v-top' },
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), m.title || CONFIG.siteName),
    h('nav', { class: 'topnav' }, h('a', { href: '#/' }, 'Documentação'), h('a', { href: '#/checklist', class: kind === 'checklist' ? 'active' : '' }, 'Checklist'), h('a', { href: '#/mensagens', class: kind === 'mensagens' ? 'active' : '' }, 'Mensagens')),
    h('span', { class: 'grow' }), themeBtn,
    logged() ? h('button', { class: 'btn sm', id: 'edtoggle', onclick: () => { editing = !editing; render(); } }, icon('pen', 14), 'Editar')
      : h('a', { class: 'btn ghost sm', href: '#/login/' + kind }, 'Entrar para editar'));
  const main = h('main', { class: 'l-main' });
  root.append(top, main);

  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); render(); };
  const tool = (ic, label, fn, cls = '') => h('button', { class: `icon-btn ${cls}`, title: label, 'aria-label': label, style: { width: '28px', height: '28px' }, onclick: fn }, icon(ic, 14));
  const del = async (arr, i, what) => { if (await ask({ title: 'Excluir', message: `Excluir ${what}?`, confirm: 'Excluir', danger: true })) { arr.splice(i, 1); save(); render(); } };
  const input = (val, ph, on, extra = {}) => h('input', { class: 'input', value: val || '', placeholder: ph, 'aria-label': ph, oninput: (e) => on(e.target.value), onchange: () => save(), ...extra });
  const docSelect = (val, on) => {
    const s = h('select', { class: 'select', style: { width: 'auto', maxWidth: '260px', height: '32px' }, 'aria-label': 'Documento do tutorial', onchange: (e) => { on(e.target.value); save(); } },
      h('option', { value: '' }, 'Sem documento'), pages.map((p) => h('option', { value: p.path, selected: p.path === val }, p.label)));
    return s;
  };

  function renderChecklist() {
    data.sections.forEach((sec, si) => {
      const done = sec.items.filter((i) => ticks.has(i.id)).length;
      const box = h('section', { class: 'l-sec' });
      const head = h('header', {});
      if (editing) head.append(h('div', { class: 'grow' }, input(sec.title, 'Nome da seção', (v) => { sec.title = v; })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir seção', () => move(data.sections, si, -1)), tool('arrow-down', 'Descer seção', () => move(data.sections, si, 1)), tool('trash', 'Excluir seção', () => del(data.sections, si, `a seção "${sec.title}"`), 'danger')));
      else head.append(h('span', {}, sec.title), h('span', { class: 'prog' }, `${done}/${sec.items.length}`));
      box.append(head);
      sec.items.forEach((it, ii) => {
        const row = h('div', { class: `l-item${!editing && ticks.has(it.id) ? ' done' : ''}` });
        if (editing) {
          row.append(h('div', { class: 'l-edit' }, input(it.text, 'Procedimento', (v) => { it.text = v; }), h('div', { class: 'row' }, input(it.note, 'Observação (opcional)', (v) => { it.note = v; }, { style: { flex: 1, minWidth: '160px', height: '32px' } }), docSelect(it.doc, (v) => { it.doc = v; }))),
            h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir', () => move(sec.items, ii, -1)), tool('arrow-down', 'Descer', () => move(sec.items, ii, 1)), tool('trash', 'Excluir item', () => del(sec.items, ii, 'este item'), 'danger')));
        } else {
          const cb = h('input', { type: 'checkbox', checked: ticks.has(it.id), 'aria-label': it.text, style: { width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--primary)' }, onchange: (e) => { e.target.checked ? ticks.add(it.id) : ticks.delete(it.id); LS.set(ticksKey, JSON.stringify([...ticks])); render(); } });
          const doc = it.doc && Tree.findByPath(m, it.doc);
          row.append(cb, h('div', { class: 'l-text' }, it.text, it.note ? h('div', { class: 'l-note' }, it.note) : null), doc ? h('a', { class: 'l-doc', href: '#/docs/' + it.doc }, icon('book', 12), 'Tutorial') : null);
        }
        box.append(row);
      });
      if (editing) box.append(h('button', { class: 'dashed l-add', onclick: () => { sec.items.push({ id: uid(), text: '', note: '', doc: '' }); save(); render(); } }, icon('plus', 14), 'Adicionar item'));
      main.append(box);
    });
    if (editing) main.append(h('button', { class: 'dashed', onclick: () => { data.sections.push({ id: uid(), title: 'Nova seção', items: [] }); save(); render(); } }, icon('plus', 14), 'Nova seção'));
  }

  function renderMessages() {
    data.groups.forEach((g, gi) => {
      const box = h('section', { class: 'l-sec' });
      const head = h('header', {});
      if (editing) head.append(h('div', { class: 'grow' }, input(g.title, 'Nome do grupo', (v) => { g.title = v; })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir grupo', () => move(data.groups, gi, -1)), tool('arrow-down', 'Descer grupo', () => move(data.groups, gi, 1)), tool('trash', 'Excluir grupo', () => del(data.groups, gi, `o grupo "${g.title}"`), 'danger')));
      else head.append(h('span', {}, g.title));
      const grid = h('div', { class: 'msg-grid' });
      g.messages.forEach((msg, mi) => {
        const card = h('div', { class: 'msg-card' });
        if (editing) {
          const ta = h('textarea', { class: 'input', rows: 4, 'aria-label': 'Texto da mensagem', oninput: (e) => { msg.text = e.target.value; }, onchange: () => save() }); ta.value = msg.text || '';
          card.append(h('div', { class: 'top' }, h('div', { class: 'grow' }, input(msg.title, 'Título da mensagem', (v) => { msg.title = v; })), h('div', { class: 'l-tools' }, tool('arrow-up', 'Subir', () => move(g.messages, mi, -1)), tool('arrow-down', 'Descer', () => move(g.messages, mi, 1)), tool('trash', 'Excluir mensagem', () => del(g.messages, mi, 'esta mensagem'), 'danger'))), ta);
        } else {
          const b = h('button', { class: 'btn primary sm', onclick: async () => { const ok = await copy(msg.text || ''); toast(ok ? 'Mensagem copiada!' : 'Não foi possível copiar.', { type: ok ? 'ok' : 'error', ms: 1800 }); b.replaceChildren(icon('check', 14), 'Copiado'); setTimeout(() => b.replaceChildren(icon('copy', 14), 'Copiar'), 1500); } }, icon('copy', 14), 'Copiar');
          card.append(h('div', { class: 'top' }, h('h3', {}, msg.title), b), h('div', { class: 'msg-text' }, msg.text));
        }
        grid.append(card);
      });
      if (editing) grid.append(h('button', { class: 'dashed', onclick: () => { g.messages.push({ id: uid(), title: 'Nova mensagem', text: '' }); save(); render(); } }, icon('plus', 14), 'Adicionar mensagem'));
      box.append(head, grid); main.append(box);
    });
    if (editing) main.append(h('button', { class: 'dashed', onclick: () => { data.groups.push({ id: uid(), title: 'Novo grupo', messages: [] }); save(); render(); } }, icon('plus', 14), 'Novo grupo'));
  }

  function render() {
    const y = scrollY; clear(main);
    const tg = document.getElementById('edtoggle'); if (tg) tg.replaceChildren(icon(editing ? 'check' : 'pen', 14), editing ? 'Concluir edição' : 'Editar');
    const titleEl = editing ? input(data.title, 'Título da página', (v) => { data.title = v; }, { style: { fontSize: '22px', fontWeight: 700, height: '42px', maxWidth: '420px' } }) : h('h1', {}, data.title || C.title);
    const head = h('div', { class: 'l-head' }, titleEl);
    if (!editing && kind === 'checklist') head.append(h('span', { class: 'grow' }), h('button', { class: 'btn sm', onclick: () => { ticks.clear(); LS.set(ticksKey, '[]'); render(); } }, 'Limpar marcações'));
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
