// Estado do aplicativo: sessão, arquivos (original + rascunho) e manifesto. Sem servidor: tudo vem do repositório.
import { CONFIG, MANIFEST_PATH, pagePath } from './config.js';
import { GitHub, GitHubError, textToB64, bytesToB64 } from './github.js';
import { parseFrontmatter, composeFile } from './md.js';
import { diffLines } from './diff.js';
import * as Tree from './tree.js';

const KEY = `${CONFIG.owner}/${CONFIG.repo}@${CONFIG.branch}`;
const LS = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignora */ } },
};
const SS = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignora */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* ignora */ } },
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
let pending = false;
const emit = () => { if (pending) return; pending = true; queueMicrotask(() => { pending = false; listeners.forEach((f) => f()); }); };

export const state = {
  auth: null,            // { token, user, remember }
  gh: null,
  remote: null,          // Map caminho → sha (só com login)
  files: new Map(),      // caminho → { base, sha, text, bin, deleted }
  manifest: null,
  manifestError: null,
};

const entry = (path) => {
  let e = state.files.get(path);
  if (!e) { e = { base: null, sha: null, text: null, bin: null, deleted: false }; state.files.set(path, e); }
  return e;
};
const isEmpty = (e) => e.text === null && e.bin === null && !e.deleted;
const prune = (path) => { const e = state.files.get(path); if (e && isEmpty(e) && e.base === null) state.files.delete(path); };

// ───────────── Persistência de rascunhos ─────────────
function persist() {
  const out = {};
  for (const [p, e] of state.files) if (!isEmpty(e)) out[p] = { text: e.text, bin: e.bin, deleted: e.deleted };
  if (Object.keys(out).length) { if (!LS.set('hub.drafts.' + KEY, JSON.stringify(out))) console.warn('Rascunho grande demais para o navegador.'); } else LS.del('hub.drafts.' + KEY);
}
function restoreDrafts() {
  try {
    const d = JSON.parse(LS.get('hub.drafts.' + KEY) || '{}');
    for (const [p, v] of Object.entries(d)) Object.assign(entry(p), { text: v.text ?? null, bin: v.bin ?? null, deleted: !!v.deleted });
  } catch { /* rascunho corrompido: ignora */ }
}

// ───────────── Sessão ─────────────
export async function login(token, remember = true) {
  token = token.trim();
  if (!token) throw new Error('Cole o token de acesso.');
  const gh = new GitHub({ token, owner: CONFIG.owner, repo: CONFIG.repo, branch: CONFIG.branch });
  const user = await gh.user();
  let info;
  try { info = await gh.repoInfo(); } catch (e) {
    if (e.status === 404) throw new Error(`O token não enxerga o repositório ${CONFIG.owner}/${CONFIG.repo}. Ao criar o token, selecione este repositório.`);
    throw e;
  }
  if (!info.permissions?.push) throw new Error('Este token só tem leitura. Dê a permissão "Contents: Read and write" ao criá-lo.');
  state.gh = gh; state.auth = { token, user: { login: user.login, name: user.name, avatar: user.avatar_url }, remember };
  (remember ? LS : SS).set('hub.token', token); (remember ? SS : LS).del('hub.token');
  await refreshRemote();
  emit();
}

export async function resume() {
  const t = LS.get('hub.token') || SS.get('hub.token');
  if (!t) return false;
  try { await login(t, !!LS.get('hub.token')); return true; } catch (e) {
    if (e.status === 401) { LS.del('hub.token'); SS.del('hub.token'); }
    return false;
  }
}

export function logout() {
  LS.del('hub.token'); SS.del('hub.token');
  state.auth = null; state.gh = null; state.remote = null;
  emit();
}

export async function refreshRemote() { state.remote = state.gh ? await state.gh.tree() : null; emit(); }

// ───────────── Arquivos ─────────────
const staticFetch = async (path) => {
  const r = await fetch(path, { cache: 'no-cache' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Falha ao carregar ${path} (${r.status})`);
  return r.text();
};

/** Texto atual (rascunho > original). Busca do servidor se ainda não carregado. */
export async function readText(path) {
  const e = state.files.get(path);
  if (e?.deleted) return null;
  if (e?.text != null) return e.text;
  if (e && e.base !== null) return e.base;
  let base = null, sha = null;
  if (state.gh) { const f = await state.gh.file(path); if (f) { base = f.text; sha = f.sha; } }
  else base = await staticFetch(path);
  const n = entry(path); n.base = base; n.sha = sha; n.loaded = true;
  return n.text ?? base;
}

export function textNow(path) { const e = state.files.get(path); if (!e || e.deleted) return null; return e.text ?? e.base; }

export function setText(path, text) {
  const e = entry(path); e.deleted = false; e.bin = null;
  e.text = (e.base !== null && text === e.base) ? null : text;
  prune(path); persist(); emit();
}

export function setBinary(path, b64) { const e = entry(path); e.deleted = false; e.text = null; e.bin = b64; persist(); emit(); }

const existsRemote = (path) => (state.remote ? state.remote.has(path) : (state.files.get(path)?.base ?? null) !== null);

export function deleteFile(path) {
  const e = entry(path);
  e.text = null; e.bin = null;
  if (existsRemote(path)) e.deleted = true; else e.deleted = false;
  prune(path); persist(); emit();
}

export function discard(path) {
  const e = state.files.get(path); if (!e) return;
  e.text = null; e.bin = null; e.deleted = false; prune(path); persist(); emit();
}

export const discardAll = () => { for (const p of [...state.files.keys()]) discard(p); };
export const isModified = (path) => { const e = state.files.get(path); return !!e && !isEmpty(e); };
export const draftPaths = () => [...state.files].filter(([, e]) => !isEmpty(e)).map(([p]) => p);
export const draftCount = () => draftPaths().length;

export async function ensureBase(path) {
  const e = entry(path);
  if (e.base !== null || e.sha !== null || !state.gh || !existsRemote(path)) return e;
  const f = await state.gh.file(path);
  if (f) { e.base = f.text; e.sha = f.sha; }
  return e;
}

/** Todos os caminhos conhecidos (remotos + rascunhos novos − apagados). */
export function allFilePaths() {
  const s = new Set(state.remote ? state.remote.keys() : []);
  for (const [p, e] of state.files) { if (e.deleted) s.delete(p); else if (e.text !== null || e.bin !== null || e.base !== null) s.add(p); }
  return [...s].sort();
}

// ───────────── Manifesto ─────────────
let mCache = { text: undefined, obj: null };
export function manifest() {
  const text = textNow(MANIFEST_PATH);
  if (text === null || text === undefined) return mCache.obj || Tree.emptyManifest(CONFIG.siteName);
  if (text === mCache.text) return mCache.obj;
  try { mCache = { text, obj: Tree.normalize(JSON.parse(text)) }; state.manifestError = null; }
  catch (e) { state.manifestError = `sidebar.json inválido: ${e.message}`; return mCache.obj || Tree.emptyManifest(CONFIG.siteName); }
  return mCache.obj;
}
export async function loadManifest() {
  const t = await readText(MANIFEST_PATH);
  if (t === null) { mCache = { text: undefined, obj: Tree.emptyManifest(CONFIG.siteName) }; return mCache.obj; }
  return manifest();
}
/** Aplica `fn` a uma cópia do manifesto e grava como rascunho. */
export function editManifest(fn) {
  const m = structuredClone(manifest());
  const r = fn(m);
  setText(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
  return r;
}

// ───────────── Páginas ─────────────
export async function loadPage(path) {
  const text = await readText(pagePath(path));
  if (text === null) return null;
  const { data, body } = parseFrontmatter(text);
  return { fm: data, body, text };
}
export const savePage = (path, fm, body) => setText(pagePath(path), composeFile(fm, body));

/** Atualiza frontmatter da página sem tocar no corpo. */
export async function patchPageFm(path, patch) {
  const p = await loadPage(path);
  const fm = { ...(p?.fm || {}) };
  for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === null || v === '' || v === false && k !== 'toc') delete fm[k]; else fm[k] = v; }
  savePage(path, fm, p?.body ?? '');
}

export function pageExists(path) { const p = pagePath(path); const e = state.files.get(p); if (e?.deleted) return false; return !!(e && (e.text !== null || e.base !== null)) || !!state.remote?.has(p); }

// ───────────── Imagens ─────────────
export async function addImage(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = (file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i)?.[0] || '.png').toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imagem';
  let name = base + ext, i = 2;
  while (allFilePaths().includes(`${CONFIG.assetsDir}/${name}`)) name = `${base}-${i++}${ext}`;
  const path = `${CONFIG.assetsDir}/${name}`;
  setBinary(path, bytesToB64(bytes));
  return { path, src: path, alt: base.replace(/-/g, ' ') };
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
/** Resolve URLs de markdown para o navegador (imagens ainda não publicadas viram data:). */
export function resolveUrl(u) {
  if (/^(https?:|data:|mailto:|#|\/\/)/i.test(u)) return u;
  const clean = u.replace(/^\.?\//, '');
  const e = state.files.get(clean);
  if (e?.bin) return `data:${MIME[clean.split('.').pop().toLowerCase()] || 'application/octet-stream'};base64,${e.bin}`;
  return clean;
}

// ───────────── Alterações e publicação ─────────────
export async function changes() {
  const out = [];
  for (const path of draftPaths()) {
    const e = state.files.get(path);
    const remoteHas = existsRemote(path);
    if (e.bin !== null) { out.push({ path, status: remoteHas ? 'M' : 'A', binary: true, add: 0, del: 0 }); continue; }
    if (remoteHas) await ensureBase(path);
    if (e.deleted) { out.push({ path, status: 'D', add: 0, del: (e.base ?? '').split('\n').length, before: e.base ?? '', after: '' }); continue; }
    const d = diffLines(e.base ?? '', e.text ?? '');
    out.push({ path, status: remoteHas ? 'M' : 'A', add: d.stats.add, del: d.stats.del, before: e.base ?? '', after: e.text ?? '' });
  }
  const order = { 'sidebar.json': 1 };
  return out.sort((a, b) => (order[a.path.split('/').pop()] || 0) - (order[b.path.split('/').pop()] || 0) || a.path.localeCompare(b.path));
}

export function suggestMessage(list) {
  if (!list.length) return 'docs: atualiza conteúdo';
  const name = (p) => p.replace(/^content\//, '').replace(/\.md$/, '');
  const pagesOnly = list.filter((c) => c.path.endsWith('.md'));
  if (list.length === 1) { const c = list[0]; return `docs: ${c.status === 'A' ? 'adiciona' : c.status === 'D' ? 'remove' : 'atualiza'} ${name(c.path)}`; }
  if (pagesOnly.length === 1) return `docs: atualiza ${name(pagesOnly[0].path)} e estrutura`;
  return `docs: atualiza ${list.length} arquivos`;
}

export class ConflictError extends Error { constructor(paths) { super('Alguns arquivos mudaram no GitHub desde que você começou a editar.'); this.paths = paths; } }

export async function publish({ message, mode = 'direct', branchName, paths, force = false }) {
  if (!state.gh) throw new Error('Entre com sua conta para publicar.');
  const fresh = await state.gh.tree();
  const chosen = paths.filter((p) => isModified(p));
  if (!force) {
    const bad = chosen.filter((p) => { const e = state.files.get(p); return (e.sha && fresh.get(p) !== e.sha) || (!e.sha && !state.remote?.has(p) && fresh.has(p)); });
    if (bad.length) throw new ConflictError(bad);
  }
  const files = chosen.map((p) => { const e = state.files.get(p); return e.deleted ? { path: p, remove: true } : e.bin !== null ? { path: p, b64: e.bin } : { path: p, text: e.text }; });
  if (!files.length) throw new Error('Nada para publicar.');
  const res = await state.gh.commit({ message, files, mode, newBranch: branchName, prTitle: message.split('\n')[0] });
  if (mode === 'direct') {
    for (const p of chosen) {
      const e = state.files.get(p);
      if (e.deleted) state.files.delete(p);
      else { if (e.text !== null) e.base = e.text; e.text = null; e.bin = null; e.sha = null; if (e.base === null) state.files.delete(p); }
    }
    persist();
    await refreshRemote();
    for (const p of chosen) { const e = state.files.get(p); if (e) e.sha = state.remote.get(p) || null; }
  } else {
    chosen.forEach(discard);   // as alterações agora vivem no branch do Pull Request
  }
  emit();
  return res;
}

export { GitHubError, textToB64 };
