// Tela "Publicar alterações".
import { h, icon, modal, toast, clear } from '../ui.js';
import { CONFIG, pagePath } from '../config.js';
import * as S from '../store.js';
import * as Tree from '../tree.js';
import { collapseDiff, diffLines } from '../diff.js';

export async function openPublish(ed) {
  const list = await S.changes();
  if (!list.length) { toast('Não há alterações para publicar.'); return; }
  const checked = new Set(list.map((c) => c.path));
  let shown = list[0].path, mode = 'direct', busy = false;
  const message = h('textarea', { class: 'input', rows: 2, 'aria-label': 'Mensagem do commit' });
  message.value = S.suggestMessage(list);
  const listEl = h('div', { class: 'chg-list' });
  const diffEl = h('div', {});
  const checksEl = h('div', { class: 'stack', style: { gap: '6px' } });
  const optsEl = h('div', { class: 'stack', style: { gap: '8px' } });
  const errEl = h('div', { class: 'err hidden', role: 'alert' });
  const sum = h('span', { class: 'muted small grow' });

  const files = new Set(S.allFilePaths());
  const problems = () => {
    const out = Tree.validate(S.manifest(), (p) => files.has(pagePath(p)));
    if (S.state.manifestError) out.push(S.state.manifestError);
    return out;
  };

  const renderList = () => {
    clear(listEl);
    list.forEach((c) => listEl.append(h('div', { class: `chg${c.path === shown ? ' sel' : ''}`, onclick: () => { shown = c.path; renderList(); renderDiff(); } },
      h('button', { class: `chk${checked.has(c.path) ? ' on' : ''}`, role: 'checkbox', 'aria-checked': String(checked.has(c.path)), 'aria-label': `Incluir ${c.path}`, onclick: (e) => { e.stopPropagation(); checked.has(c.path) ? checked.delete(c.path) : checked.add(c.path); renderList(); renderSummary(); } }, checked.has(c.path) ? icon('check', 12, '#fff', 3) : null),
      h('span', { class: `st-badge ${c.status}` }, c.status),
      h('span', { class: 'grow', style: { fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.path),
      c.binary ? h('span', { class: 'muted small' }, 'imagem') : h('span', { class: 'small' }, h('b', { style: { color: 'var(--green)' } }, '+' + c.add), ' ', h('b', { style: { color: 'var(--red)' } }, '−' + c.del)))));
  };
  const renderDiff = () => {
    clear(diffEl);
    const c = list.find((x) => x.path === shown); if (!c) return;
    diffEl.append(h('div', { class: 'label', style: { margin: '10px 0 6px' } }, `Diferenças em ${c.path}`));
    if (c.binary) { diffEl.append(h('p', { class: 'muted small' }, 'Arquivo binário (imagem).')); return; }
    const rows = collapseDiff(diffLines(c.before, c.after).rows, 2);
    diffEl.append(h('div', { class: 'diff' }, rows.map((r) => r.t === '…' ? h('div', { class: 'g' }, '⋯') : h('div', { class: r.t === '+' ? 'a' : r.t === '-' ? 'd' : '' }, (r.t === ' ' ? '  ' : r.t + ' ') + r.x))));
  };
  const renderChecks = () => {
    clear(checksEl);
    const pr = problems();
    if (!pr.length) checksEl.append(h('div', { class: 'ok-line' }, icon('check', 14), 'Estrutura do menu válida (sem caminhos duplicados nem arquivos ausentes)'));
    else pr.forEach((p) => checksEl.append(h('div', { class: 'ok-line warn' }, icon('alert', 14), p)));
    return pr;
  };
  const opt = (k, ic, title, sub) => h('button', { type: 'button', class: `opt${mode === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(mode === k), onclick: () => { mode = k; renderOpts(); renderSummary(); } },
    h('span', { class: 'radio' }), h('span', { class: 'tile' }, icon(ic, 16)), h('span', { class: 'grow' }, h('b', { style: { display: 'block', fontSize: '13px' } }, title), h('span', { class: 'muted small' }, sub)));
  const renderOpts = () => {
    clear(optsEl);
    optsEl.append(opt('direct', 'branch', `Publicar direto em ${CONFIG.branch}`, 'O site atualiza assim que o GitHub processar.'),
      opt('pr', 'pr', 'Abrir Pull Request', 'Cria um branch novo para alguém revisar antes de entrar.'),
      opt('draft', 'save', 'Manter como rascunho', 'Nada vai ao GitHub; fica salvo neste navegador.'));
  };
  const publishBtn = h('button', { class: 'btn primary', onclick: go }, icon('upload', 15), 'Publicar');
  const renderSummary = () => {
    const n = checked.size;
    sum.textContent = `${n} de ${list.length} arquivo(s) selecionado(s)`;
    publishBtn.disabled = busy || (mode !== 'draft' && n === 0);
    publishBtn.replaceChildren(icon(mode === 'draft' ? 'save' : 'upload', 15), mode === 'draft' ? 'Manter rascunho' : mode === 'pr' ? 'Abrir Pull Request' : 'Publicar');
  };

  async function go() {
    if (mode === 'draft') { m.close(); toast('Mantido como rascunho neste navegador.', { type: 'ok' }); return; }
    const msg = message.value.trim();
    if (!msg) { errEl.textContent = 'Escreva uma mensagem para o commit.'; errEl.classList.remove('hidden'); return; }
    busy = true; errEl.classList.add('hidden'); renderSummary(); publishBtn.textContent = 'Publicando…';
    const paths = [...checked];
    try {
      const run = (force) => S.publish({ message: msg + '\n\nCo-authored-by: ' + S.state.auth.user.login + ' <' + S.state.auth.user.login + '@users.noreply.github.com>', mode, branchName: `docs/${Date.now().toString(36)}`, paths, force });
      let res;
      try { res = await run(false); }
      catch (e) {
        if (!(e instanceof S.ConflictError)) throw e;
        const { ask } = await import('../ui.js');
        const okForce = await ask({ title: 'Conflito', message: `${e.message}\n\n${e.paths.join(', ')}\n\nSobrescrever mesmo assim com a sua versão?`, confirm: 'Sobrescrever', danger: true });
        if (!okForce) { busy = false; renderSummary(); return; }
        res = await run(true);
      }
      m.close(); await ed.reloadDoc(); ed.sidebar.render();
      toast(mode === 'pr' ? 'Pull Request aberto.' : 'Publicado! O site atualiza em instantes.', { type: 'ok', ms: 9000, href: res.prUrl || res.commitUrl, label: mode === 'pr' ? 'Ver PR' : 'Ver commit' });
    } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); busy = false; renderSummary(); }
  }

  const body = h('div', { class: 'stack' },
    h('div', { class: 'field' }, h('label', {}, `Alterações (${list.length})`), listEl, diffEl),
    h('div', { class: 'field' }, h('label', {}, 'Mensagem do commit'), message),
    checksEl, h('div', { class: 'field' }, h('label', {}, 'Destino'), optsEl), errEl);
  const m = modal({ title: 'Publicar alterações', sub: `${CONFIG.owner}/${CONFIG.repo} · ${CONFIG.branch}`, width: 640, body,
    footer: [sum, h('button', { class: 'btn', onclick: () => m.close() }, 'Cancelar'), publishBtn] });
  renderList(); renderDiff(); renderOpts(); renderSummary();
  const pr = renderChecks();
  if (pr.length) toast('Há avisos na estrutura do menu — confira antes de publicar.', { type: 'error' });
}
