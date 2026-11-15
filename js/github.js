// Cliente mínimo da API do GitHub (roda direto no navegador, CORS liberado pelo GitHub).
const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

export const b64ToBytes = (b64) => Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0));
export function bytesToB64(bytes) {
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
export const textToB64 = (t) => bytesToB64(new TextEncoder().encode(t));
export const b64ToText = (b) => new TextDecoder().decode(b64ToBytes(b));

const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

export class GitHub {
  constructor({ token, owner, repo, branch }) { Object.assign(this, { token, owner, repo, branch }); }

  async req(method, path, body) {
    let res;
    try {
      res = await fetch(path.startsWith('http') ? path : API + path, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch (e) { throw new GitHubError('Sem conexão com o GitHub. Verifique sua internet.', 0); }
    if (res.status === 204) return null;
    let data = null; try { data = await res.json(); } catch { /* sem corpo */ }
    if (!res.ok) {
      const msg = res.status === 401 ? 'Token inválido ou expirado.'
        : res.status === 403 && /rate limit/i.test(data?.message || '') ? 'Limite de requisições do GitHub atingido. Tente novamente em alguns minutos.'
        : res.status === 403 ? 'Sem permissão. O token precisa de acesso de escrita (Contents) a este repositório.'
        : res.status === 404 ? 'Não encontrado (ou o token não tem acesso a este repositório).'
        : data?.message || `Erro ${res.status} do GitHub.`;
      throw new GitHubError(msg, res.status, data);
    }
    return data;
  }

  repoPath(p = '') { return `/repos/${this.owner}/${this.repo}${p}`; }
  user() { return this.req('GET', '/user'); }
  repoInfo() { return this.req('GET', this.repoPath()); }

  /** Mapa caminho → sha de todos os arquivos do branch. Repositório vazio → mapa vazio. */
  async tree() {
    try {
      const t = await this.req('GET', this.repoPath(`/git/trees/${encodeURIComponent(this.branch)}?recursive=1`));
      return new Map((t.tree || []).filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
    } catch (e) {
      if (e.status === 404 || e.status === 409) return new Map();
      throw e;
    }
  }

  /** Lê um arquivo de texto. Retorna {text, sha} ou null se não existir. */
  async file(path) {
    try {
      const d = await this.req('GET', this.repoPath(`/contents/${encPath(path)}?ref=${encodeURIComponent(this.branch)}`));
      if (Array.isArray(d)) return null;
      let content = d.content;
      if (!content && d.sha) content = (await this.req('GET', this.repoPath(`/git/blobs/${d.sha}`))).content;
      return { text: b64ToText(content || ''), sha: d.sha, b64: content || '' };
    } catch (e) { if (e.status === 404) return null; throw e; }
  }

  async head() {
    const ref = await this.req('GET', this.repoPath(`/git/ref/heads/${encodeURIComponent(this.branch)}`));
    return ref.object.sha;
  }

  /**
   * Cria um único commit com vários arquivos.
   * files: [{path, text} | {path, b64} | {path, remove:true}]
   * mode: 'direct' (atualiza o branch) | 'pr' (cria branch novo + Pull Request)
   */
  async commit({ message, files, mode = 'direct', newBranch, prTitle, prBody }) {
    let headSha = null, baseTree = null;
    try {
      headSha = await this.head();
      baseTree = (await this.req('GET', this.repoPath(`/git/commits/${headSha}`))).tree.sha;
    } catch (e) {
      if (!(e.status === 404 || e.status === 409)) throw e;   // repositório vazio: primeiro commit
      if (mode === 'pr') throw new GitHubError('Não dá para abrir Pull Request em um repositório vazio.', 409);
    }
    const entries = [];
    for (const f of files) {
      if (f.remove) entries.push({ path: f.path, mode: '100644', type: 'blob', sha: null });
      else if (f.b64 !== undefined) {
        const b = await this.req('POST', this.repoPath('/git/blobs'), { content: f.b64, encoding: 'base64' });
        entries.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha });
      } else entries.push({ path: f.path, mode: '100644', type: 'blob', content: f.text });
    }
    const tree = await this.req('POST', this.repoPath('/git/trees'), { ...(baseTree ? { base_tree: baseTree } : {}), tree: entries });
    const commit = await this.req('POST', this.repoPath('/git/commits'), { message, tree: tree.sha, parents: headSha ? [headSha] : [] });
    const out = { commitSha: commit.sha, commitUrl: `https://github.com/${this.owner}/${this.repo}/commit/${commit.sha}` };
    if (mode === 'pr') {
      await this.req('POST', this.repoPath('/git/refs'), { ref: `refs/heads/${newBranch}`, sha: commit.sha });
      const pr = await this.req('POST', this.repoPath('/pulls'), { title: prTitle || message.split('\n')[0], head: newBranch, base: this.branch, body: prBody || '' });
      out.prUrl = pr.html_url; out.branch = newBranch;
    } else if (headSha) {
      try { await this.req('PATCH', this.repoPath(`/git/refs/heads/${encodeURIComponent(this.branch)}`), { sha: commit.sha, force: false }); }
      catch (e) { if (e.status === 422) throw new GitHubError('Outra pessoa publicou enquanto você editava. Recarregue a página e tente de novo.', 422); throw e; }
    } else {
      await this.req('POST', this.repoPath('/git/refs'), { ref: `refs/heads/${this.branch}`, sha: commit.sha });
    }
    return out;
  }
}
