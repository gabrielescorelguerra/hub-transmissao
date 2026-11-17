// Editor visual por blocos (contenteditable). Cada bloco guarda `src`; só vira "dirty" quando o usuário edita.
import { h, icon, clear, toast, menu, closeMenu } from '../ui.js';
import { inlineHtml, htmlToInlineMd, blockSource, detectType, sourceToBlocks, listEnter } from '../md.js';
import * as S from '../store.js';

const TEXT_TYPES = ['p', 'h1', 'h2', 'h3', 'h4', 'quote'];
const TYPE_LABEL = { p: 'Texto', h1: 'Título 1', h2: 'Título 2', h3: 'Título 3', h4: 'Título 4', ul: 'Lista', ol: 'Lista numerada', quote: 'Citação', callout: 'Aviso', code: 'Código', image: 'Imagem', hr: 'Divisor', raw: 'Avançado' };
const SLASH = [
  ['p', 'Texto', 'Parágrafo simples', 'T'], ['h2', 'Título 2', 'Seção principal', 'H2'], ['h3', 'Título 3', 'Subseção', 'H3'], ['h4', 'Título 4', 'Título pequeno', 'H4'],
  ['ul', 'Lista', 'Com marcadores', '•'], ['ol', 'Lista numerada', '1. 2. 3.', '1.'], ['quote', 'Citação', 'Destaque de texto', '"'],
  ['callout', 'Aviso / Dica', 'Caixa colorida', '!'], ['code', 'Código', 'Bloco de código', '</>'], ['image', 'Imagem', 'Enviar ou colar', '▣'], ['hr', 'Divisor', 'Linha horizontal', '—'],
];
const KINDS = [['tip', 'Dica'], ['info', 'Info'], ['note', 'Nota'], ['warning', 'Atenção'], ['danger', 'Perigo']];

const make = (type) => {
  const b = { type, dirty: true };
  if (TEXT_TYPES.includes(type)) b.text = '';
  else if (type === 'ul' || type === 'ol') b.items = [''];
  else if (type === 'callout') Object.assign(b, { kind: 'tip', title: '', text: '' });
  else if (type === 'code') Object.assign(b, { lang: '', text: '' });
  else if (type === 'image') Object.assign(b, { alt: '', src: '' });
  return b;
};
const textOf = (b) => (b.items ? b.items.join(' ') : b.text || '');

export function createVisual(ed) {
  let canvas, pageEl, blocksEl, titleIn, sel = null, device = 'desktop';
  const fileIn = h('input', { type: 'file', accept: 'image/*', class: 'hidden', 'aria-hidden': 'true' });
  let fileCb = null;
  fileIn.addEventListener('change', async () => { const f = fileIn.files[0]; fileIn.value = ''; if (f && fileCb) fileCb(f); });
  const blocks = () => ed.doc.blocks;
  const touch = (b) => { if (b) b.dirty = true; ed.touch(); };

  // ───────── montagem ─────────
  function mount(c) {
    canvas = c; clear(canvas);
    const tools = h('div', { class: 'canvas-tools' }, h('div', { class: 'pill-seg', role: 'group', 'aria-label': 'Tamanho da prévia' },
      [['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Celular']].map(([k, l]) => h('button', { class: device === k ? 'on' : '', onclick: (e) => { device = k; pageEl.className = 'page ' + (k === 'desktop' ? '' : k); e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, l))));
    const node = ed.node();
    titleIn = h('input', { class: 'title-input', placeholder: 'Título da página', 'aria-label': 'Título da página', value: ed.doc.fm.title || node?.label || '' });
    titleIn.addEventListener('input', () => { ed.doc.fm.title = titleIn.value; ed.touch(); });
    titleIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); focusBlock(0); } });
    blocksEl = h('div', { class: 'blocks' });
    pageEl = h('article', { class: 'page ' + (device === 'desktop' ? '' : device) }, h('div', { class: 'title-wrap' }, titleIn), blocksEl);
    pageEl.addEventListener('paste', onPaste);
    pageEl.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
    pageEl.addEventListener('drop', (e) => { const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); addImageBlock(f, blocks().length); } });
    canvas.append(tools, pageEl, fileIn);
    if (!blocks().length) blocks().push(make('p'));
    sel = null; renderBlocks();
  }

  function renderBlocks(focusIdx, atEnd = true) {
    closeMenu();
    clear(blocksEl);
    blocks().forEach((b, i) => { blocksEl.append(blockEl(b, i)); });
    blocksEl.append(h('div', { class: 'insert-row', style: { opacity: 1, height: '30px' } }, h('button', { type: 'button', onclick: (e) => openSlash(e.currentTarget, blocks().length) }, icon('plus', 13), 'Adicionar bloco')));
    if (focusIdx !== undefined) focusBlock(focusIdx, atEnd);
  }

  function focusBlock(i, atEnd = true) {
    const el = blocksEl.children[i]; if (!el) return;
    const md = el.querySelector('.mdb'); if (md) { md._edit(atEnd); return; }
    const f = el.querySelector('[contenteditable="true"],textarea,input');
    if (!f) { select(blocks()[i], el); return; }
    f.focus();
    if (f.isContentEditable) { const r = document.createRange(); r.selectNodeContents(f); r.collapse(!atEnd); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  }

  // ───────── seleção e barra flutuante ─────────
  function select(b, el) {
    if (sel === b && el.querySelector('.btoolbar')) return;
    blocksEl.querySelectorAll('.blk.sel').forEach((x) => { x.classList.remove('sel'); x.querySelector('.btoolbar')?.remove(); });
    sel = b; el.classList.add('sel'); el.append(toolbar(b));
  }
  function toolbar(b) {
    const i = () => blocks().indexOf(b);
    const keep = (e) => e.preventDefault();
    const btn = (ic, label, fn, cls = '') => h('button', { type: 'button', class: cls, title: label, 'aria-label': label, onmousedown: keep, onclick: fn }, typeof ic === 'string' && ic.length < 3 && !/[a-z-]{3,}/.test(ic) ? ic : icon(ic, 15));
    const textual = TEXT_TYPES.includes(b.type) || b.type === 'ul' || b.type === 'ol' || b.type === 'callout';
    const bar = h('div', { class: 'btoolbar', role: 'toolbar', onmousedown: (e) => { if (!(e.target.closest('button'))) return; } },
      h('button', { type: 'button', onmousedown: keep, onclick: (e) => typeMenu(e.currentTarget, b) }, TYPE_LABEL[b.type] || b.type, icon('chev-d', 12)),
      ...(textual ? [h('span', { class: 'sep' }),
        h('button', { type: 'button', title: 'Negrito (Ctrl+B)', onmousedown: keep, onclick: () => fmt('bold'), style: { fontWeight: 800 } }, 'B'),
        h('button', { type: 'button', title: 'Itálico (Ctrl+I)', onmousedown: keep, onclick: () => fmt('italic'), style: { fontStyle: 'italic' } }, 'I'),
        h('button', { type: 'button', title: 'Código inline', onmousedown: keep, onclick: () => inlineCode(), style: { fontFamily: 'var(--mono)' } }, '</>'),
        btn('link', 'Link', (e) => linkPop(e.currentTarget))] : []),
      h('span', { class: 'sep' }),
      btn('arrow-up', 'Mover para cima', () => move(b, -1)), btn('arrow-down', 'Mover para baixo', () => move(b, 1)),
      btn('copy', 'Duplicar', () => { const c = structuredClone(b); c.dirty = true; blocks().splice(i() + 1, 0, c); ed.touch(); renderBlocks(i() + 1); }),
      btn('trash', 'Excluir bloco', () => remove(b), 'danger'));
    return bar;
  }
  // Blocos de texto são editados como markdown puro (textarea .mdsrc); o callout ainda usa contenteditable.
  const mdTa = () => { const a = document.activeElement; return a?.classList?.contains('mdsrc') ? a : null; };
  const wrapSel = (ta, l, r = l) => {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    if (s >= l.length && v.slice(s - l.length, s) === l && v.slice(e, e + r.length) === r) { ta.setRangeText(v.slice(s, e), s - l.length, e + r.length, 'select'); }
    else { ta.setRangeText(l + v.slice(s, e) + r, s, e, 'select'); ta.setSelectionRange(s + l.length, e + l.length); }
    ta.dispatchEvent(new Event('input'));
  };
  const fmt = (cmd) => { const t = mdTa(); if (t) return wrapSel(t, cmd === 'bold' ? '**' : '*'); document.execCommand(cmd); };
  function inlineCode() {
    const ta = mdTa(); if (ta) return wrapSel(ta, '`');
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return;
    const t = s.toString(); document.execCommand('insertHTML', false, `<code>${t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</code>`);
  }
  function linkPop(anchor) {
    const t = mdTa();
    if (t) {
      const a = t.selectionStart, z = t.selectionEnd; if (a === z) { toast('Selecione o texto que será o link.'); return; }
      const wrap = t.closest('.mdb'); const r = anchor.getBoundingClientRect();
      const inp = h('input', { class: 'input', placeholder: 'https://… ou caminho da página', 'aria-label': 'Endereço do link' });
      const pop = h('div', { class: 'linkpop', style: { left: r.left + 'px', top: r.bottom + 6 + 'px' } }, inp, h('button', { class: 'btn primary sm', onclick: apply }, 'Aplicar'));
      function apply() { const u = inp.value.trim(); pop.remove(); if (!u) return; const v = t.value; wrap._setSrc(`${v.slice(0, a)}[${v.slice(a, z)}](${u})${v.slice(z)}`); }
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } else if (e.key === 'Escape') pop.remove(); });
      document.body.append(pop); inp.focus();
      setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', off); } }), 0);
      return;
    }
    const s = getSelection(); const range = s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
    if (!range || range.collapsed) { toast('Selecione o texto que será o link.'); return; }
    const r = anchor.getBoundingClientRect();
    const inp = h('input', { class: 'input', placeholder: 'https://… ou caminho da página', 'aria-label': 'Endereço do link' });
    const pop = h('div', { class: 'linkpop', style: { left: r.left + 'px', top: r.bottom + 6 + 'px' } }, inp, h('button', { class: 'btn primary sm', onclick: apply }, 'Aplicar'));
    function apply() { const u = inp.value.trim(); pop.remove(); s.removeAllRanges(); s.addRange(range); if (u) document.execCommand('createLink', false, u); }
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } else if (e.key === 'Escape') pop.remove(); });
    document.body.append(pop); inp.focus();
    setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', off); } }), 0);
  }
  function typeMenu(anchor, b) {
    menu(anchor, SLASH.map(([t, l]) => ({ label: l, active: b.type === t, onClick: () => convert(b, t) })));
  }

  // ───────── operações ─────────
  function convert(b, type) {
    const i = blocks().indexOf(b); if (i < 0) return;
    const txt = textOf(b);
    const nb = make(type);
    if ('text' in nb) nb.text = txt; else if (nb.items) nb.items = b.items && (type === 'ul' || type === 'ol') ? b.items : [txt];
    if (type === 'code') nb.text = txt;
    blocks().splice(i, 1, nb); ed.touch(); sel = null; renderBlocks(i);
  }
  function move(b, d) {
    const i = blocks().indexOf(b), j = i + d; if (j < 0 || j >= blocks().length) return;
    blocks().splice(i, 1); blocks().splice(j, 0, b); ed.touch(); sel = null; renderBlocks();
    const el = blocksEl.children[j]; if (el) select(b, el);
  }
  function remove(b) {
    const i = blocks().indexOf(b); blocks().splice(i, 1);
    if (!blocks().length) blocks().push(make('p'));
    ed.touch(); sel = null; renderBlocks(Math.max(0, i - 1));
  }
  function insertAt(i, type, focus = true) {
    const nb = make(type); blocks().splice(i, 0, nb); ed.touch(); sel = null;
    if (type === 'image') { renderBlocks(); pickImage(nb); return; }
    renderBlocks(focus ? i : undefined);
    return nb;
  }
  function openSlash(anchor, index, onPick) {
    menu(anchor, SLASH.map(([t, l, sub]) => ({ label: l, hint: sub, onClick: () => (onPick ? onPick(t) : insertAt(index, t)) })));
  }
  async function addImageBlock(file, index) {
    try {
      const im = await S.addImage(file);
      const nb = { type: 'image', alt: im.alt, src: im.src, dirty: true };
      blocks().splice(index, 0, nb); ed.touch(); renderBlocks(); toast('Imagem adicionada. Ela será enviada ao publicar.', { type: 'ok' });
    } catch (e) { toast('Não foi possível ler a imagem.', { type: 'error' }); }
  }
  function pickImage(b) {
    fileCb = async (f) => { const im = await S.addImage(f); b.src = im.src; b.alt = b.alt || im.alt; touch(b); renderBlocks(); };
    fileIn.click();
  }
  function onPaste(e) {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); const i = sel ? blocks().indexOf(sel) + 1 : blocks().length; addImageBlock(f, i); return; }
    if (e.target.closest('[contenteditable="true"]')) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }
  }

  // ───────── elemento de bloco ─────────
  function blockEl(b, idx) {
    const el = h('div', { class: 'blk', dataset: { i: idx } });
    const grip = h('button', { type: 'button', class: 'grip', draggable: 'true', title: 'Arrastar', 'aria-label': 'Arrastar bloco' }, icon('grip', 14));
    el.append(h('div', { class: 'gutter' }, h('button', { type: 'button', class: 'add', title: 'Adicionar bloco abaixo', 'aria-label': 'Adicionar bloco abaixo', onclick: (e) => openSlash(e.currentTarget, blocks().indexOf(b) + 1) }, icon('plus', 14)), grip));
    el.append(body(b, el));
    el.addEventListener('focusin', () => select(b, el));
    el.addEventListener('mousedown', (e) => { if (!e.target.closest('.btoolbar')) select(b, el); });
    grip.addEventListener('dragstart', (e) => { ed.blockDrag = b; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'bloco'); e.dataTransfer.setDragImage(el, 0, 0); });
    grip.addEventListener('dragend', () => { ed.blockDrag = null; el.classList.remove('dragging'); blocksEl.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after')); });
    el.addEventListener('dragover', (e) => {
      if (!ed.blockDrag || ed.blockDrag === b) return; e.preventDefault();
      blocksEl.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
      const r = el.getBoundingClientRect(); const before = e.clientY < r.top + r.height / 2;
      el.classList.add(before ? 'drop-before' : 'drop-after'); el.dataset.pos = before ? 'b' : 'a';
    });
    el.addEventListener('drop', (e) => {
      const d = ed.blockDrag; if (!d || d === b) return; e.preventDefault();
      const before = el.dataset.pos === 'b'; ed.blockDrag = null;
      blocks().splice(blocks().indexOf(d), 1); const t = blocks().indexOf(b);
      blocks().splice(before ? t : t + 1, 0, d); ed.touch(); sel = null; renderBlocks();
    });
    return el;
  }

  function ce(b, cls, ph) {
    const node = h('div', { class: `ce ${cls}`, contenteditable: 'true', 'data-ph': ph, role: 'textbox', 'aria-multiline': 'true', 'aria-label': TYPE_LABEL[b.type] });
    node.innerHTML = inlineHtml(b.text || '', S.resolveUrl);
    node.addEventListener('input', () => {
      b.text = htmlToInlineMd(node); touch(b);
      if (b.type === 'p') shortcuts(b, node);
      const m = /^\/([^\s]*)$/.exec(node.textContent);
      if (m && b.type === 'p') slashFilter(node, b, m[1]); else closeSlash();
    });
    node.addEventListener('keydown', (e) => textKeys(e, b, node));
    return node;
  }

  function shortcuts(b, node) {
    const t = node.textContent.replace(/ /g, ' ');
    const rules = [[/^#{1,4} $/, () => 'h' + t.trim().length], [/^[-*] $/, () => 'ul'], [/^1[.)] $/, () => 'ol'], [/^> $/, () => 'quote'], [/^```$/, () => 'code'], [/^:::$/, () => 'callout']];
    for (const [re, to] of rules) if (re.test(t)) { const i = blocks().indexOf(b); const nb = make(to()); blocks().splice(i, 1, nb); ed.touch(); sel = null; renderBlocks(i); return; }
  }

  // menu "/"
  let slashEl = null, slashIdx = 0, slashItems = [], slashCtx = null;
  function closeSlash() { slashEl?.remove(); slashEl = null; slashCtx = null; }
  function slashFilter(node, b, q) {
    const nz = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const qq = nz(q);
    slashItems = SLASH.filter(([t, l]) => !qq || nz(l).includes(qq) || t.includes(qq));
    if (!slashItems.length) { closeSlash(); return; }
    slashIdx = Math.min(slashIdx, slashItems.length - 1); slashCtx = { node, b };
    const r = node.getBoundingClientRect();
    if (!slashEl) { slashEl = h('div', { class: 'slash', role: 'listbox' }); document.body.append(slashEl); }
    clear(slashEl);
    slashItems.forEach(([t, l, sub, tile], i) => slashEl.append(h('button', { type: 'button', class: i === slashIdx ? 'sel' : '', role: 'option', onmousedown: (e) => { e.preventDefault(); pickSlash(i); } }, h('span', { class: 'tile' }, tile), h('span', {}, l, h('small', {}, sub)))));
    slashEl.style.left = Math.min(r.left, innerWidth - 280) + 'px'; slashEl.style.top = Math.min(r.bottom + 4, innerHeight - 310) + 'px';
  }
  function pickSlash(i) {
    const { b } = slashCtx || {}; const t = slashItems[i]?.[0]; closeSlash(); if (!b || !t) return;
    const idx = blocks().indexOf(b);
    if (t === 'p') { b.text = ''; touch(b); renderBlocks(idx); return; }
    const nb = make(t); blocks().splice(idx, 1, nb); ed.touch(); sel = null;
    if (t === 'image') { renderBlocks(); pickImage(nb); } else renderBlocks(idx);
  }

  const txt = (node) => (node.value !== undefined ? node.value : node.textContent);
  function slashKeys(e, b, node) {
    if (!slashEl) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); slashIdx = (slashIdx + 1) % slashItems.length; slashFilter(node, b, txt(node).slice(1)); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); slashIdx = (slashIdx - 1 + slashItems.length) % slashItems.length; slashFilter(node, b, txt(node).slice(1)); return true; }
    if (e.key === 'Enter') { e.preventDefault(); pickSlash(slashIdx); return true; }
    if (e.key === 'Escape') { e.preventDefault(); closeSlash(); return true; }
    return false;
  }

  // ───────── bloco de texto em markdown (estilo Obsidian) ─────────
  // Fora de foco: renderizado. Em foco: o markdown cru, editável. Ao sair, o texto vira o bloco certo
  // (digitar "## " cria título, "- " lista, "> " citação, "---" divisor, colar várias linhas cria vários blocos).
  const PH = { p: "Escreva em markdown, ou digite '/' para inserir um bloco", h1: 'Título 1', h2: 'Título 2', h3: 'Título 3', h4: 'Título 4', quote: 'Citação' };
  function viewContent(b) {
    if (b.type === 'ul' || b.type === 'ol') {
      const list = h(b.type, { class: `ce ${b.type}` });
      (b.items.length ? b.items : ['']).forEach((t) => { const li = document.createElement('li'); li.innerHTML = inlineHtml(t, S.resolveUrl); list.append(li); });
      return list;
    }
    const node = h('div', { class: `ce ${b.type}`, 'data-ph': PH[b.type] || '' });
    if (b.text) node.innerHTML = inlineHtml(b.text, S.resolveUrl);
    return node;
  }
  const srcIndex = (src, prefix) => { let j = 0; for (const ch of prefix) { const k = src.indexOf(ch, j); if (k < 0) break; j = k + 1; } return j; };
  function caretOffset(view, x, y) {
    let node, off;
    if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); node = p?.offsetNode; off = p?.offset; }
    else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); node = r?.startContainer; off = r?.startOffset; }
    if (!node || !view.contains(node)) return null;
    const r = document.createRange(); r.setStart(view, 0); r.setEnd(node, off); return r.toString();
  }

  function mdBlock(b) {
    const wrap = h('div', { class: 'mdb' });
    const view = h('div', { class: 'mdview', tabIndex: 0 });
    const ta = h('textarea', { class: 'mdsrc', rows: 1, 'aria-label': 'Texto (markdown)', autocapitalize: 'sentences' });
    wrap.append(view, ta);
    let editing = false, startType = b.type, startSrc = '';
    const paint = () => { view.replaceChildren(viewContent(b)); };
    const size = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    const look = () => { ta.dataset.t = detectType(ta.value); };
    // mantém o modelo do documento sempre em dia (o salvamento lê direto dele)
    function sync(src) {
      const bl = sourceToBlocks(src);
      for (const k of Object.keys(b)) delete b[k];
      if (bl.length === 1) Object.assign(b, bl[0]); else Object.assign(b, { type: 'raw', src, dirty: true });
      ed.touch();
    }
    function edit(atEnd = true, pos = null) {
      if (editing) return; editing = true; startType = b.type; startSrc = blockSource(b);
      wrap.classList.add('editing'); ta.value = startSrc; look(); size(); ta.focus({ preventScroll: true });
      const p = pos === null ? (atEnd ? ta.value.length : 0) : pos; ta.setSelectionRange(p, p);
    }
    function leave() {
      if (!editing) return; editing = false; wrap.classList.remove('editing');
      const i = blocks().indexOf(b); if (i < 0) return;
      if (ta.value !== startSrc) {
        const bl = sourceToBlocks(ta.value);
        if (!(bl.length === 1 && bl[0].type === startType && b.type === startType)) { blocks().splice(i, 1, ...bl); ed.touch(); sel = null; renderBlocks(); return; }
      }
      paint();
    }
    wrap._edit = edit;
    wrap._setSrc = (src) => { sync(src); if (editing) { ta.value = blockSource(b); look(); size(); } else edit(true); };
    paint();
    view.addEventListener('click', (e) => { e.preventDefault(); const pre = caretOffset(view, e.clientX, e.clientY); edit(true, null); if (pre !== null) { const p = srcIndex(ta.value, pre); ta.setSelectionRange(p, p); } });
    view.addEventListener('focus', () => edit(true));
    ta.addEventListener('blur', () => { if (document.hasFocus()) leave(); });
    ta.addEventListener('input', () => {
      look(); size(); sync(ta.value);
      const m = /^\/([^\s]*)$/.exec(ta.value);
      if (m && ta.dataset.t === 'p') slashFilter(ta, b, m[1]); else closeSlash();
    });
    ta.addEventListener('keydown', (e) => {
      if (slashKeys(e, b, ta)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && 'bi'.includes(e.key.toLowerCase())) { e.preventDefault(); wrapSel(ta, e.key.toLowerCase() === 'b' ? '**' : '*'); return; }
      if (e.key === 'Escape') { ta.blur(); return; }
      const i = blocks().indexOf(b);
      if (e.key === 'Enter' && !e.shiftKey && !mod && !e.isComposing) {
        e.preventDefault();
        const pos = ta.selectionStart, end = ta.selectionEnd, t = detectType(ta.value);
        if (t === 'ul' || t === 'ol') {
          const r = listEnter(ta.value, pos, end);
          if (r && !r.exit) { ta.value = r.value; ta.setSelectionRange(r.caret, r.caret); ta.dispatchEvent(new Event('input')); return; }
          if (r?.exit) { editing = false; sync(r.value); const nb = make('p'); blocks().splice(i + 1, 0, nb); sel = null; renderBlocks(i + 1); return; }
        }
        const before = ta.value.slice(0, pos), after = ta.value.slice(end);
        editing = false; sync(before);
        const nb = make(t === 'quote' ? 'quote' : 'p'); nb.text = after;
        blocks().splice(i + 1, 0, nb); ed.touch(); sel = null; renderBlocks(i + 1, false); return;
      }
      if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
        if (!ta.value) { if (blocks().length > 1) { e.preventDefault(); editing = false; remove(b); } return; }
        if (ta.selectionStart === ta.value.length && /^(#{1,4}|>|[-*+]|\d+[.)])\s$/.test(ta.value)) { e.preventDefault(); ta.value = ''; ta.dispatchEvent(new Event('input')); return; }
      }
      if (e.key === 'ArrowUp' && ta.selectionStart === 0 && ta.selectionEnd === 0 && i > 0) { e.preventDefault(); focusBlock(i - 1); }
      if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length && i < blocks().length - 1) { e.preventDefault(); focusBlock(i + 1, false); }
    });
    return wrap;
  }

  function textKeys(e, b, node) {
    if (slashKeys(e, b, node)) return;
    const i = blocks().indexOf(b);
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && 'bi'.includes(e.key.toLowerCase())) { e.preventDefault(); fmt(e.key.toLowerCase() === 'b' ? 'bold' : 'italic'); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const s = getSelection(); const r = s.getRangeAt(0);
      const tail = document.createRange(); tail.selectNodeContents(node); tail.setStart(r.endContainer, r.endOffset);
      const frag = tail.extractContents(); const holder = h('div', {}); holder.append(frag);
      const rest = htmlToInlineMd(holder);
      b.text = htmlToInlineMd(node); if (rest || tail) touch(b);
      const nb = make(b.type === 'quote' || b.type === 'p' ? b.type : 'p'); nb.text = rest;
      blocks().splice(i + 1, 0, nb); ed.touch(); sel = null; renderBlocks(i + 1, false); return;
    }
    if (e.key === 'Backspace' && !b.text && !node.textContent) {
      e.preventDefault(); if (b.type !== 'p') { convert(b, 'p'); return; }
      if (blocks().length > 1) remove(b); return;
    }
    if (e.key === 'ArrowUp' && atEdge(node, true) && i > 0) { e.preventDefault(); focusBlock(i - 1); }
    if (e.key === 'ArrowDown' && atEdge(node, false) && i < blocks().length - 1) { e.preventDefault(); focusBlock(i + 1, false); }
  }
  function atEdge(node, start) {
    const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return false;
    const r = s.getRangeAt(0).cloneRange(); const full = document.createRange(); full.selectNodeContents(node);
    if (start) { full.setEnd(r.startContainer, r.startOffset); return full.toString().length === 0; }
    full.setStart(r.endContainer, r.endOffset); return full.toString().length === 0;
  }

  function body(b, el) {
    if (TEXT_TYPES.includes(b.type) || b.type === 'ul' || b.type === 'ol') return mdBlock(b);
    if (b.type === 'callout') {
      const box = h('div', { class: `callout-box ${b.kind}` });
      const kind = h('select', { class: 'select', style: { width: '120px', height: '26px', fontSize: '12px' }, 'aria-label': 'Tipo de aviso', onchange: (e) => { b.kind = e.target.value; box.className = `callout-box ${b.kind}`; touch(b); } }, KINDS.map(([k, l]) => h('option', { value: k, selected: k === b.kind }, l)));
      const title = h('input', { class: 'input', placeholder: 'Título (opcional)', value: b.title || '', 'aria-label': 'Título do aviso', style: { height: '26px', fontSize: '12px' }, oninput: (e) => { b.title = e.target.value; touch(b); } });
      box.append(h('div', { style: { display: 'flex', gap: '8px' } }, kind, title), ce(b, 'callout-text', 'Escreva o aviso…'));
      return box;
    }
    if (b.type === 'code') {
      const lang = h('input', { class: 'lang-in', placeholder: 'linguagem', value: b.lang || '', 'aria-label': 'Linguagem', oninput: (e) => { b.lang = e.target.value.trim(); touch(b); } });
      const ta = h('textarea', { class: 'code-edit', spellcheck: 'false', 'aria-label': 'Código', rows: Math.max(3, (b.text || '').split('\n').length) });
      ta.value = b.text || '';
      ta.addEventListener('input', () => { b.text = ta.value; ta.rows = Math.max(3, ta.value.split('\n').length); touch(b); });
      ta.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } });
      return h('div', {}, lang, ta);
    }
    if (b.type === 'image') {
      const wrap = h('div', { class: 'img-blk' });
      if (b.src) wrap.append(h('img', { src: S.resolveUrl(b.src), alt: b.alt || '' }));
      else wrap.append(h('div', { class: 'img-ph' }, icon('image', 20), 'Sem imagem'));
      wrap.append(h('div', { class: 'row' },
        h('input', { class: 'input', placeholder: 'Texto alternativo (descrição)', value: b.alt || '', 'aria-label': 'Texto alternativo', oninput: (e) => { b.alt = e.target.value; touch(b); } }),
        h('input', { class: 'input', placeholder: 'Endereço da imagem', value: b.src || '', 'aria-label': 'Endereço da imagem', onchange: (e) => { b.src = e.target.value.trim(); touch(b); renderBlocks(); } }),
        h('button', { class: 'btn sm', type: 'button', onclick: () => pickImage(b) }, icon('upload', 13), 'Enviar')));
      return wrap;
    }
    if (b.type === 'hr') return h('hr', { class: 'hr-blk' });
    // raw: tabelas, HTML, listas aninhadas… preservados exatamente
    const ta = h('textarea', { class: 'code-edit', spellcheck: 'false', 'aria-label': 'Bloco avançado (markdown)', rows: Math.max(2, (b.src || '').split('\n').length) });
    ta.value = b.src || '';
    ta.addEventListener('input', () => { b.src = ta.value; ta.rows = Math.max(2, ta.value.split('\n').length); touch(b); });
    return h('div', { class: 'raw-blk' }, h('span', { class: 't' }, 'Bloco avançado (tabela, HTML ou lista aninhada) — editado como markdown'), ta);
  }

  const onDocClick = (e) => { if (blocksEl && !e.target.closest('.blk') && !e.target.closest('.btoolbar') && !e.target.closest('.slash')) { blocksEl.querySelectorAll('.blk.sel').forEach((x) => { x.classList.remove('sel'); x.querySelector('.btoolbar')?.remove(); }); sel = null; closeSlash(); } };
  document.addEventListener('mousedown', onDocClick);

  return {
    mount,
    refresh: () => { if (blocksEl && ed.doc) { if (titleIn && document.activeElement !== titleIn) titleIn.value = ed.doc.fm.title || ''; sel = null; if (!blocks().length) blocks().push(make('p')); renderBlocks(); } },
    destroy: () => { document.removeEventListener('mousedown', onDocClick); closeSlash(); },
  };
}
