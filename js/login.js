import { h, icon, clear } from './ui.js';
import { CONFIG } from './config.js';
import * as S from './store.js';

export function mountLogin(root, onDone) {
  const tokenUrl = 'https://github.com/settings/personal-access-tokens/new';
  const err = h('div', { class: 'err hidden', role: 'alert' });
  const token = h('input', { class: 'input', type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Token de acesso do GitHub', autofocus: true });
  const remember = h('input', { type: 'checkbox', id: 'rem', checked: true });
  const btn = h('button', { class: 'btn primary', style: { width: '100%', height: '40px' } }, 'Entrar');

  const submit = async () => {
    err.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Verificando…';
    try { await S.login(token.value, remember.checked); onDone(); }
    catch (e) { err.textContent = e.message; err.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Entrar'; }
  };
  btn.addEventListener('click', submit);
  token.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  root.append(h('div', { class: 'login-wrap' }, h('div', { class: 'login-card' },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), h('b', {}, `${CONFIG.siteName} · Editor`)),
    h('div', {}, h('h1', {}, 'Entrar para editar'), h('p', { class: 'muted', style: { marginTop: '4px' } }, 'O login é feito com a sua conta do GitHub. Só quem tem permissão de escrita no repositório consegue editar.')),
    h('ol', {},
      h('li', {}, 'Abra ', h('a', { href: tokenUrl, target: '_blank', rel: 'noopener noreferrer' }, 'github.com › Settings › Fine-grained tokens'), '.'),
      h('li', {}, 'Em ', h('b', {}, 'Repository access'), ', escolha só ', h('b', {}, `${CONFIG.owner}/${CONFIG.repo}`), '.'),
      h('li', {}, 'Em ', h('b', {}, 'Permissions'), ': ', h('b', {}, 'Contents → Read and write'), ' (e ', h('b', {}, 'Pull requests → Read and write'), ' se quiser abrir PRs).'),
      h('li', {}, 'Gere o token e cole abaixo.')),
    h('div', { class: 'field' }, h('label', {}, 'Token de acesso'), token),
    h('label', { class: 'check' }, remember, 'Manter conectado neste navegador'),
    err, btn,
    h('p', { class: 'muted small' }, 'O token fica guardado só no seu navegador e é enviado apenas ao GitHub. Nada passa por outro servidor.'),
    h('a', { href: '#/', class: 'small' }, '← Voltar ao site'))));
  return () => clear(root);
}
