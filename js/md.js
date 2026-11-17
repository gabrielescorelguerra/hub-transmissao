// Markdown mínimo e seguro: frontmatter, blocos (para o editor) e renderização HTML (para o site).
// Blocos não reconhecidos viram "raw" e são preservados byte a byte.

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pagina';
}

// ───────────── Frontmatter ─────────────
function parseScalar(v) {
  v = v.trim();
  if (v === '') return '';
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) { try { return JSON.parse(v); } catch { /* cai abaixo */ } }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { data: {}, body: text, hasFrontmatter: false };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (mm) data[mm[1]] = parseScalar(mm[2]);
  }
  return { data, body: text.slice(m[0].length).replace(/^\r?\n/, ''), hasFrontmatter: true };
}

function fmValue(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (s === '' || /^[\s]|[\s]$|^[-?:,[\]{}#&*!|>'"%@`]|: |\s#|^(true|false|null|-?\d+(\.\d+)?)$/.test(s)) return JSON.stringify(s);
  return s;
}

export function stringifyFrontmatter(data) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== '');
  if (!keys.length) return '';
  return `---\n${keys.map((k) => `${k}: ${fmValue(data[k])}`).join('\n')}\n---\n\n`;
}

export function composeFile(fm, body) { return stringifyFrontmatter(fm) + body.replace(/^\n+/, ''); }

// ───────────── Inline ─────────────
const safeUrl = (u) => (/^\s*(javascript|data|vbscript):/i.test(u) ? '#' : u);

/** Markdown inline → HTML. `resolve` ajusta URLs de imagens/links relativos. */
export function inlineHtml(text, resolve = (u) => u) {
  const stash = [];
  const keep = (html) => { stash.push(html); return `\u0000${stash.length - 1}\u0000`; };
  let s = String(text);
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|<>~])/g, (_, c) => keep(esc(c)));
  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => keep(`<img src="${esc(resolve(safeUrl(src), true))}" alt="${esc(alt)}">`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, t, u) => {
    const url = safeUrl(u);
    const ext = /^https?:\/\//i.test(url);
    return keep(`<a href="${esc(resolve(url, false))}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(t)}</a>`);
  });
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
  // **negrito com *itálico* dentro** já tratado acima; restaura os trechos guardados
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

/** DOM contenteditable → markdown inline. */
export function htmlToInlineMd(node) {
  let out = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) { out += c.nodeValue.replace(/ /g, ' ').replace(/([\\`*_[\]])/g, '\\$1'); continue; }
    if (c.nodeType !== 1) continue;
    const t = c.tagName;
    const inner = () => htmlToInlineMd(c);
    if (t === 'STRONG' || t === 'B') { const i = inner(); out += i.trim() ? `**${i}**` : i; }
    else if (t === 'EM' || t === 'I') { const i = inner(); out += i.trim() ? `*${i}*` : i; }
    else if (t === 'CODE') out += `\`${c.textContent}\``;
    else if (t === 'A') out += `[${inner()}](${c.getAttribute('href') || ''})`;
    else if (t === 'BR') out += ' ';
    else if (t === 'IMG') out += `![${c.getAttribute('alt') || ''}](${c.getAttribute('src') || ''})`;
    else if (t === 'DIV' || t === 'P') out += (out && !out.endsWith(' ') ? ' ' : '') + inner();
    else out += inner();
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

// ───────────── Blocos ─────────────
const RE = {
  fence: /^```\s*([\w+-]*)\s*$/,
  admon: /^:::(note|tip|info|warning|danger)\b\s*(.*)$/i,
  heading: /^(#{1,4})\s+(.*?)\s*#*\s*$/,
  hr: /^(?:-{3,}|\*{3,}|_{3,})\s*$/,
  image: /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/,
  ul: /^\s*[-*+]\s+(.*)$/,
  ol: /^\s*\d+[.)]\s+(.*)$/,
  quote: /^>\s?(.*)$/,
  tableSep: /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/,
};

const isBlockStart = (l, next) => RE.fence.test(l) || RE.admon.test(l) || RE.heading.test(l) || RE.hr.test(l) || RE.image.test(l)
  || RE.ul.test(l) || RE.ol.test(l) || RE.quote.test(l) || /^</.test(l) || (l.includes('|') && next !== undefined && RE.tableSep.test(next));

export function parseBlocks(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const push = (b, start, end) => { b.src = lines.slice(start, end).join('\n'); b.dirty = false; blocks.push(b); };
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '') { i++; continue; }
    const start = i;
    let m;
    if ((m = RE.fence.exec(l))) {
      const buf = []; i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      push({ type: 'code', lang: m[1], text: buf.join('\n') }, start, Math.min(i, lines.length)); continue;
    }
    if ((m = RE.admon.exec(l))) {
      const buf = []; i++;
      while (i < lines.length && lines[i].trim() !== ':::') buf.push(lines[i++]);
      i++;
      push({ type: 'callout', kind: m[1].toLowerCase(), title: m[2], text: buf.join(' ').replace(/\s+/g, ' ').trim() }, start, Math.min(i, lines.length)); continue;
    }
    if ((m = RE.heading.exec(l))) { i++; push({ type: 'h' + m[1].length, text: m[2] }, start, i); continue; }
    if (RE.hr.test(l)) { i++; push({ type: 'hr' }, start, i); continue; }
    if ((m = RE.image.exec(l))) { i++; push({ type: 'image', alt: m[1], src: m[2] }, start, i); continue; }
    if (RE.ul.test(l) || RE.ol.test(l)) {
      const ordered = RE.ol.test(l) && !RE.ul.test(l);
      const re = ordered ? RE.ol : RE.ul; const items = [];
      while (i < lines.length && (m = re.exec(lines[i]))) { items.push(m[1]); i++; }
      // linhas indentadas (listas aninhadas) → bloco bruto para não perder estrutura
      if (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
        while (i < lines.length && lines[i].trim() !== '') i++;
        push({ type: 'raw' }, start, i); continue;
      }
      push({ type: ordered ? 'ol' : 'ul', items }, start, i); continue;
    }
    if (RE.quote.test(l)) {
      const buf = [];
      while (i < lines.length && (m = RE.quote.exec(lines[i]))) { buf.push(m[1]); i++; }
      push({ type: 'quote', text: buf.join(' ').replace(/\s+/g, ' ').trim() }, start, i); continue;
    }
    if (/^</.test(l) || (l.includes('|') && RE.tableSep.test(lines[i + 1] ?? ''))) {
      while (i < lines.length && lines[i].trim() !== '') i++;
      push({ type: 'raw' }, start, i); continue;
    }
    // parágrafo
    const buf = [l.trim()]; i++;
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i], lines[i + 1])) buf.push(lines[i++].trim());
    push({ type: 'p', text: buf.join(' ') }, start, i);
  }
  return blocks;
}

export function blockToMd(b) {
  if (!b.dirty && b.src !== undefined) return b.src;
  switch (b.type) {
    case 'h1': case 'h2': case 'h3': case 'h4': return `${'#'.repeat(+b.type[1])} ${b.text}`;
    case 'p': return b.text;
    case 'ul': return b.items.map((t) => `- ${t}`).join('\n');
    case 'ol': return b.items.map((t, i) => `${i + 1}. ${t}`).join('\n');
    case 'quote': return `> ${b.text}`;
    case 'callout': return `:::${b.kind}${b.title ? ' ' + b.title : ''}\n${b.text}\n:::`;
    case 'code': return '```' + (b.lang || '') + '\n' + b.text + '\n```';
    case 'image': return `![${b.alt || ''}](${b.src || ''})`;
    case 'hr': return '---';
    default: return b.src || '';
  }
}

export const blocksToMd = (blocks) => blocks.map(blockToMd).join('\n\n') + (blocks.length ? '\n' : '');

// ───────────── Renderização (site) ─────────────
function renderTable(src, rs) {
  const rows = src.split('\n').map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const head = rows[0]; const body = rows.slice(2);
  const cell = (t, tag) => `<${tag}>${inlineHtml(t, rs)}</${tag}>`;
  return `<table><thead><tr>${head.map((c) => cell(c, 'th')).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('')}</tbody></table>`;
}

const ADMON_LABEL = { note: 'Nota', tip: 'Dica', info: 'Info', warning: 'Atenção', danger: 'Perigo' };

export function renderBlocks(blocks, { resolve } = {}) {
  const rs = resolve || ((u) => u);
  const toc = []; const used = new Set();
  const uid = (t) => { let b = slugify(t), n = b, k = 2; while (used.has(n)) n = `${b}-${k++}`; used.add(n); return n; };
  const html = blocks.map((b) => {
    switch (b.type) {
      case 'h1': case 'h2': case 'h3': case 'h4': {
        const id = uid(b.text.replace(/[*_`[\]]/g, ''));
        if (b.type !== 'h1') toc.push({ level: +b.type[1], text: b.text.replace(/\*\*|`|\\/g, ''), id });
        return `<${b.type} id="${id}">${inlineHtml(b.text, rs)}</${b.type}>`;
      }
      case 'p': return `<p>${inlineHtml(b.text, rs)}</p>`;
      case 'ul': return `<ul>${b.items.map((t) => `<li>${inlineHtml(t, rs)}</li>`).join('')}</ul>`;
      case 'ol': return `<ol>${b.items.map((t) => `<li>${inlineHtml(t, rs)}</li>`).join('')}</ol>`;
      case 'quote': return `<blockquote>${inlineHtml(b.text, rs)}</blockquote>`;
      case 'callout': return `<div class="admon admon-${b.kind}"><div class="admon-title">${esc(b.title || ADMON_LABEL[b.kind] || b.kind)}</div><div>${inlineHtml(b.text, rs)}</div></div>`;
      case 'code': return `<pre><code>${esc(b.text)}</code></pre>`;
      case 'image': return `<p><img src="${esc(rs(safeUrl(b.src), true))}" alt="${esc(b.alt || '')}" loading="lazy"></p>`;
      case 'hr': return '<hr>';
      default: {
        const s = b.src || '';
        if (s.includes('|') && RE.tableSep.test(s.split('\n')[1] || '')) return renderTable(s, rs);
        return `<p class="raw">${esc(s)}</p>`;
      }
    }
  }).join('\n');
  return { html, toc };
}

export function renderMarkdown(body, opts) { return renderBlocks(parseBlocks(body), opts); }

// ───────────── Edição em markdown dentro de um bloco (estilo Obsidian) ─────────────
/** Fonte markdown editável de um bloco de texto. */
export const blockSource = (b) => blockToMd({ ...b, dirty: true });

/** Tipo de bloco que o texto digitado representa (só olha a primeira linha). */
export function detectType(src) {
  let m;
  if ((m = /^(#{1,4})\s/.exec(src))) return 'h' + m[1].length;
  if (/^>\s?/.test(src)) return 'quote';
  if (/^\s*[-*+]\s/.test(src)) return 'ul';
  if (/^\s*\d+[.)]\s/.test(src)) return 'ol';
  return 'p';
}

/** Converte o texto digitado em blocos (nunca vazio; todos marcados como editados). */
export function sourceToBlocks(src) {
  const bl = parseBlocks(src);
  if (!bl.length) return [{ type: 'p', text: '', dirty: true }];
  bl.forEach((b) => { b.dirty = true; });
  return bl;
}

/** Enter dentro de uma lista: continua o marcador ou sai da lista se o item está vazio. */
export function listEnter(value, pos, end = pos) {
  const ls = value.slice(0, pos).lastIndexOf('\n') + 1;
  let le = value.indexOf('\n', pos); if (le < 0) le = value.length;
  const line = value.slice(ls, le);
  if (/^\s*(?:[-*+]|\d+[.)])\s*$/.test(line)) return { exit: true, value: value.slice(0, ls).replace(/\n$/, '') + value.slice(le) };
  const m = /^(\s*)(?:([-*+])|(\d+)([.)]))\s/.exec(line);
  if (!m) return null;
  const marker = m[2] ? `${m[2]} ` : `${Number(m[3]) + 1}${m[4]} `;
  const ins = `\n${m[1]}${marker}`;
  return { exit: false, value: value.slice(0, pos) + ins + value.slice(end), caret: pos + ins.length };
}
