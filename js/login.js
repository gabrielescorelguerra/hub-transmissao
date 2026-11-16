// Login do editor: senha fixa (abre o token cifrado em auth.json). Primeiro acesso: define a senha a partir de um token do GitHub.
import { h, icon, clear, toast } from './ui.js';
import { CONFIG } from './config.js';
import * as S from './store.js';
import { encryptToken, decryptToken } from './crypto.js';

async function loadBlob() {
  try { const r = await fetch('auth.json', { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); return j?.data ? j : null; } catch { return null; }
}

export function mountLogin(root, onDone) {
  let blob = null, mode = 'loading';
  const card = h('div', { class: 'login-card' });
  root.append(h('div', { class: 'login-wrap' }, card));
  const tokenUrl = 'https://github.com/settings/personal-access-tokens/new';
  const head = (title, sub) => [
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), h('b', {}, `${CONFIG.siteName} · Editor`)),
    h('div', {}, h('h1', {}, title), h('p', { class: 'muted', style: { marginTop: '4px' } }, sub))];
  const errBox = () => h('div', { class: 'err hidden', role: 'alert' });
  const fail = (el, msg) => { el.textContent = msg; el.classList.remove('hidden'); };
  const rememberBox = () => h('input', { type: 'checkbox', checked: true });

  function renderPassword() {
    const err = errBox(), pw = h('input', { class: 'input', type: 'password', placeholder: 'Senha', autocomplete: 'current-password', 'aria-label': 'Senha', autofocus: true }), rem = rememberBox();
    const btn = h('button', { class: 'btn primary', style: { width: '100%', height: '40px' } }, 'Entrar');
    const go = async () => {
      err.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Verificando…';
      try { const token = await decryptToken(blob, pw.value); await S.login(token, rem.checked); onDone(); }
      catch (e) { fail(err, e.status === 401 ? 'A senha abriu, mas o token salvo expirou. Use "Primeiro acesso / trocar senha" para gerar um novo.' : e.message); btn.disabled = false; btn.textContent = 'Entrar'; }
    };
    btn.addEventListener('click', go); pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    clear(card).append(...head('Entrar para editar', 'Digite a senha do editor.'),
      h('div', { class: 'field' }, h('label', {}, 'Senha'), pw), h('label', { class: 'check' }, rem, 'Manter conectado neste navegador'), err, btn,
      h('button', { class: 'btn ghost sm', onclick: () => { mode = 'setup'; render(); } }, 'Primeiro acesso / trocar senha'),
      h('a', { href: '#/', class: 'small' }, '← Voltar ao site'));
  }

  function renderSetup() {
    const err = errBox();
    const tok = h('input', { class: 'input', type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', 'aria-label': 'Token do GitHub' });
    const p1 = h('input', { class: 'input', type: 'password', placeholder: 'Nova senha (mín. 6 caracteres)', autocomplete: 'new-password', 'aria-label': 'Nova senha' });
    const p2 = h('input', { class: 'input', type: 'password', placeholder: 'Repita a senha', autocomplete: 'new-password', 'aria-label': 'Repita a senha' });
    const btn = h('button', { class: 'btn primary', style: { width: '100%', height: '40px' } }, 'Salvar senha e entrar');
    const go = async () => {
      err.classList.add('hidden');
      if (p1.value.length < 6) return fail(err, 'A senha precisa ter pelo menos 6 caracteres.');
      if (p1.value !== p2.value) return fail(err, 'As senhas não são iguais.');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        await S.login(tok.value, true);
        const enc = await encryptToken(tok.value.trim(), p1.value);
        await S.state.gh.commit({ message: 'chore: define a senha do editor', files: [{ path: 'auth.json', text: JSON.stringify(enc, null, 2) + '\n' }], mode: 'direct' });
        toast('Senha definida! Em instantes o site passa a aceitar só a senha.', { type: 'ok', ms: 6000 });
        onDone();
      } catch (e) { fail(err, e.message); btn.disabled = false; btn.textContent = 'Salvar senha e entrar'; }
    };
    btn.addEventListener('click', go);
    clear(card).append(...head('Primeiro acesso', 'Faça isso uma vez: o token do GitHub é guardado cifrado no repositório e aberto pela senha que você escolher.'),
      h('ol', {},
        h('li', {}, 'Abra ', h('a', { href: tokenUrl, target: '_blank', rel: 'noopener noreferrer' }, 'github.com › Settings › Fine-grained tokens'), '.'),
        h('li', {}, 'Em ', h('b', {}, 'Repository access'), ', escolha só ', h('b', {}, `${CONFIG.owner}/${CONFIG.repo}`), '.'),
        h('li', {}, 'Em ', h('b', {}, 'Permissions'), ': ', h('b', {}, 'Contents → Read and write'), '.'),
        h('li', {}, 'Gere o token, cole abaixo e escolha uma senha.')),
      h('div', { class: 'field' }, h('label', {}, 'Token do GitHub'), tok), h('div', { class: 'field' }, h('label', {}, 'Senha do editor'), p1, p2), err, btn,
      blob ? h('button', { class: 'btn ghost sm', onclick: () => { mode = 'password'; render(); } }, '← Voltar para a senha') : null,
      h('p', { class: 'muted small' }, 'Senha fixa e simples: quem souber a senha edita o site. Como o repositório é a base de tudo, escolha uma senha que você não use em outro lugar.'),
      h('a', { href: '#/', class: 'small' }, '← Voltar ao site'));
  }

  function render() {
    if (mode === 'loading') { clear(card).append(h('div', { class: 'v-empty' }, 'Carregando…')); return; }
    (mode === 'password' ? renderPassword : renderSetup)();
  }
  render();
  loadBlob().then((b) => { blob = b; mode = b ? 'password' : 'setup'; render(); });
  return () => clear(root);
}
