// Modo código: explorador de arquivos do repositório, editor com realce e prévia.
import { h, icon, clear, toast, debounce } from '../ui.js';
import { esc, parseFrontmatter, renderMarkdown } from '../md.js';
import * as S from '../store.js';

const TEXT = /\.(md|json|txt|css|js|mjs|html|yml|yaml|svg|xml|csv)$/i;

function highlight(text, path) {
  if (/\.json$/i.test(path)) {
    return esc(text).replace(/(&quot;(?:[^&\\]|&(?!quot;)|\\.)*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
      (m, s, colon, kw, num) => s ? (colon ? `<span class="tk-h">${s}</span>${colon}` : `<span class="tk-s">${s}</span>`) : kw ? `<span class="tk-k">${kw}</span>` : `<span class="tk-n">${num}</span>`);
  }
  if (/\.md$/i.test(path)) {
    let inFm = false, inCode = false;
    return text.split('\n').map((line, i) => {
      let e = esc(line);
      if (/^---\s*$/.test(line) && (i === 0 || inFm)) { inFm = !inFm; return `<span class="tk-c">${e}</span>`; }
      if (inFm) return e.replace(/^([\w-]+)(:)(.*)$/, '<span class="tk-h">$1</span>$2<span class="tk-s">$3</span>');
      if (/^```/.test(line)) { inCode = !inCode; return `<span class="tk-c">${e}</span>`; }
      if (inCode) return `<span class="tk-s">${e}</span>`;
      if (/^#{1,6}\s/.test(line)) return `<span class="tk-h">${e}</span>`;
      if (/^:::/.test(line)) return `<span class="tk-k">${e}</span>`;
      return e.replace(/(\*\*[^*]+\*\*)/g, '<span class="tk-b">$1</span>').replace(/(`[^`]+`)/g, '<span class="tk-s">$1</span>').replace(/(\[[^\]]*\]\([^)]*\))/g, '<span class="tk-k">$1</span>');
    }).join('\n');
  }
  return esc(text);
}

export function createCode(ed) {
  const st = { open: [], cur: null, expanded: new Set(['content']) };
  const cursorInfo = h('span', {}, '');
  const explorer = h('aside', { class: 'ed-files', 'aria-label': 'Arquivos' });
  const tabsEl = h('div', { class: 'file-tabs', role: 'tablist' });
  const nums = h('div', { class: 'gutter-nums', 'aria-hidden': 'true' });
  const pre = h('pre', { 'aria-hidden': 'true' });
  const ta = h('textarea', { spellcheck: 'false', 'aria-label': 'Editor de código', autocapitalize: 'off', autocomplete: 'off', wrap: 'off' });
  const stack = h('div', { class: 'code-stack' }, pre, ta);
  const info = h('div', { class: 'empty-state hidden' });
  const area = h('div', { class: 'code-area' }, nums, stack);
  const editorCol = h('section', { class: 'code-col' }, tabsEl, area, info);
  const preview = h('aside', { class: 'preview-col' });

  const paint = () => {
    const v = ta.value;
    pre.innerHTML = highlight(v, st.cur || '') + '\n ';
    const n = v.split('\n').length;
    nums.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
    pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; nums.scrollTop = ta.scrollTop;
  };
  const updateCursor = () => {
    const before = ta.value.slice(0, ta.selectionStart).split('\n');
    cursorInfo.textContent = st.cur ? `Ln ${before.length}, Col ${before[before.length - 1].length + 1} · ${/\.json$/.test(st.cur) ? 'JSON' : /\.md$/.test(st.cur) ? 'Markdown' : 'Texto'} · UTF-8` : '';
  };
  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; nums.scrollTop = ta.scrollTop; });
  ['keyup', 'click', 'focus'].forEach((ev) => ta.addEventListener(ev, updateCursor));

  const reloadVisual = debounce(async () => {
    if (!ed.doc || !st.cur || st.cur !== 'content/' + ed.doc.path + '.md') return;
    await ed.reloadDoc();
    if (ed.mode === 'split') { ed.visual.refresh?.(); }
  }, 450);

  ta.addEventListener('input', () => {
    if (!st.cur) return;
    S.setText(st.cur, ta.value);
    paint(); updateCursor(); renderPreview(); renderTabs();
    if (st.cur === 'content/' + (ed.doc?.path || '\0') + '.md') { ed.scheduleCommit.cancel(); ed.docDirty = false; reloadVisual(); }
    if (st.cur === 'content/sidebar.json') jsonCheck();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  });
  function jsonCheck() {
    try { JSON.parse(ta.value); S.state.manifestError = null; } catch (e) { S.state.manifestError = `sidebar.json inválido: ${e.message}`; }
  }

  function renderPreview() {
    clear(preview);
    preview.append(h('div', { class: 'side-head' }, h('span', { class: 'eyebrow' }, 'Pré-visualização'), h('span', { class: 'muted small' }, 'ao vivo')));
    if (!st.cur || !/\.md$/.test(st.cur)) { preview.append(h('div', { class: 'preview-card' }, h('p', { class: 'muted' }, 'A prévia aparece para arquivos .md.'))); return; }
    const { data, body } = parseFrontmatter(ta.value);
    const { html } = renderMarkdown(body, { resolve: S.resolveUrl });
    preview.append(h('div', { class: 'preview-card' }, h('h1', { class: 'doc-title' }, data.title || ''), h('div', { class: 'prose', html })));
  }

  function renderTabs() {
    clear(tabsEl);
    st.open.forEach((p) => tabsEl.append(h('button', { class: `file-tab${p === st.cur ? ' on' : ''}`, role: 'tab', onclick: () => open(p) },
      icon('file-text', 13), p.split('/').pop(), S.isModified(p) ? h('span', { class: 'dot amber', title: 'Alterado' }) : null,
      h('span', { class: 'x', role: 'button', 'aria-label': 'Fechar aba', onclick: (e) => { e.stopPropagation(); closeTab(p); } }, icon('x', 12)))));
  }
  function closeTab(p) {
    st.open = st.open.filter((x) => x !== p);
    if (st.cur === p) { st.cur = null; const next = st.open[st.open.length - 1]; if (next) open(next); else { ta.value = ''; paint(); renderTabs(); renderPreview(); } } else renderTabs();
  }

  function renderExplorer() {
    clear(explorer);
    explorer.append(h('div', { class: 'side-head' }, h('span', { class: 'eyebrow' }, 'Arquivos'), h('span', { class: 'muted small' }, S.state.remote ? 'GitHub' : '')));
    const root = {};
    S.allFilePaths().forEach((p) => { let n = root; p.split('/').forEach((seg, i, a) => { n = n[seg] ??= i === a.length - 1 ? { __file: p } : {}; }); });
    const box = h('div', { class: 'tree', role: 'tree' });
    const draw = (node, depth, prefix) => {
      Object.entries(node).filter(([k]) => k !== '__file').sort(([ka, a], [kb, b]) => (!!a.__file - !!b.__file) || ka.localeCompare(kb)).forEach(([name, child]) => {
        const path = prefix ? prefix + '/' + name : name;
        if (child.__file) {
          const mod = S.isModified(path);
          box.append(h('div', { class: `f-row${path === st.cur ? ' sel' : ''}`, role: 'treeitem', style: { paddingLeft: 6 + depth * 14 + 'px' }, onclick: () => open(path) },
            h('span', { class: 'chev' }), icon(/\.(png|jpe?g|gif|webp|svg)$/i.test(name) ? 'image' : 'file-text', 14), h('span', { class: 'grow', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name), mod ? h('span', { class: 'st' }, 'M') : null));
        } else {
          const isOpen = st.expanded.has(path);
          box.append(h('div', { class: 'f-row', role: 'treeitem', 'aria-expanded': String(isOpen), style: { paddingLeft: 6 + depth * 14 + 'px' }, onclick: () => { isOpen ? st.expanded.delete(path) : st.expanded.add(path); renderExplorer(); } },
            h('span', { class: `chev${isOpen ? ' open' : ''}` }, icon('chev-r', 12)), icon(isOpen ? 'folder-open' : 'folder', 14), h('span', {}, name)));
          if (isOpen) draw(child, depth + 1, path);
        }
      });
    };
    draw(root, 0, '');
    explorer.append(box);
  }

  async function open(path) {
    if (!TEXT.test(path)) {
      toast('Este arquivo não é de texto e não pode ser editado aqui.'); return;
    }
    if (!st.open.includes(path)) st.open.push(path);
    st.cur = path;
    st.cur.split('/').slice(0, -1).reduce((acc, seg) => { const p = acc ? acc + '/' + seg : seg; st.expanded.add(p); return p; }, '');
    let text = '';
    try { text = (await S.readText(path)) ?? ''; } catch (e) { toast(e.message, { type: 'error' }); }
    if (st.cur !== path) return;
    ta.value = text; ta.scrollTop = 0;
    paint(); renderTabs(); renderExplorer(); renderPreview(); updateCursor();
  }

  /** O editor visual gravou no store: reflete no textarea (sem mexer no cursor se não mudou). */
  function syncFromStore() {
    if (!st.cur) return;
    const t = S.textNow(st.cur);
    if (t != null && t !== ta.value && document.activeElement !== ta) { ta.value = t; paint(); renderPreview(); }
    renderTabs();
  }
  const unsub = S.subscribe(() => { if (!explorer.isConnected) return; renderExplorer(); renderTabs(); });

  return {
    explorer, editorCol, preview, cursorInfo, open, syncFromStore,
    render: () => { renderExplorer(); renderTabs(); renderPreview(); paint(); },
    destroy: () => unsub(),
  };
}
