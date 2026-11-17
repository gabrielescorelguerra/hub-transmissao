// Casca única do site: o mesmo topo em todas as telas (marca · abas · busca · GitHub · tema · ação).
import { h, icon, toggleTheme, clear, toast } from './ui.js';
import { motionOn, setMotion } from './motion.js';
import { CONFIG } from './config.js';

const AREAS = [['docs', '#/', 'Documentação'], ['checklist', '#/checklist', 'Checklist'], ['mensagens', '#/mensagens', 'Mensagens']];

export function createShell(root) {
  const themeIcon = () => icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18);
  const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Alternar tema', onclick: () => { toggleTheme(); themeBtn.replaceChildren(themeIcon()); } }, themeIcon());
  const motionIcon = () => icon(motionOn() ? 'zap' : 'zap-off', 18);
  const paintMotion = () => { motionBtn.replaceChildren(motionIcon()); motionBtn.setAttribute('aria-pressed', String(motionOn())); motionBtn.title = motionOn() ? 'Animações ligadas (clique para desligar)' : 'Animações desligadas (clique para ligar)'; };
  const motionBtn = h('button', { class: 'icon-btn', 'aria-label': 'Animações', onclick: () => { setMotion(!motionOn()); paintMotion(); toast(motionOn() ? 'Animações ligadas' : 'Animações desligadas', { ms: 1400 }); } });
  paintMotion();
  const menuBtn = h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Abrir menu', hidden: true }, icon('menu', 20));
  const brandName = h('span', { class: 'brand-name' }, CONFIG.siteName);
  const ind = h('span', { class: 'nav-ind', 'aria-hidden': 'true' });
  const links = new Map(AREAS.map(([k, href, label]) => [k, h('a', { href, dataset: { area: k } }, label)]));
  const nav = h('nav', { class: 'topnav', 'aria-label': 'Seções do site' }, ind, ...links.values());
  const searchSlot = h('div', { class: 'slot-search' });
  const actionSlot = h('div', { class: 'slot-action' });
  const bar = h('header', { class: 'v-top' }, menuBtn,
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo' }, icon('book', 16, '#fff')), brandName), nav,
    h('span', { class: 'grow' }), searchSlot,
    h('a', { class: 'btn ghost sm gh', href: `https://github.com/${CONFIG.owner}/${CONFIG.repo}`, target: '_blank', rel: 'noopener noreferrer' }, icon('github', 15), 'GitHub'),
    motionBtn, themeBtn, actionSlot);
  const progress = h('div', { class: 'route-bar' });
  const view = h('div', { class: 'view-host' });
  root.append(bar, progress, view);

  let active = null, menuHandler = null;
  menuBtn.addEventListener('click', () => menuHandler?.());

  function place(animate = true) {
    const a = links.get(active);
    if (!a || !nav.offsetWidth) { ind.style.opacity = '0'; return; }
    if (!animate) ind.style.transition = 'none';
    ind.style.opacity = '1';
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
    if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
  }
  new ResizeObserver(() => place(false)).observe(nav);
  document.fonts?.ready.then(() => place(false));

  return {
    view,
    setActive(area) {
      const first = active === null;
      active = links.has(area) ? area : null;
      links.forEach((a, k) => { a.classList.toggle('active', k === active); a.setAttribute('aria-current', k === active ? 'page' : 'false'); });
      place(!first);
    },
    /** Aplica o que a tela montada pediu (busca, menu, botão de ação, nome). Chamado no instante da troca. */
    apply(ctx) {
      brandName.textContent = ctx.brand || CONFIG.siteName;
      clear(searchSlot); if (ctx.search) searchSlot.append(ctx.search);
      clear(actionSlot); if (ctx.action) actionSlot.append(ctx.action);
      menuHandler = ctx.menu || null; menuBtn.hidden = !menuHandler;
    },
    setHidden(v) { bar.hidden = v; document.body.classList.toggle('no-shell', v); },
    loading(v) { progress.classList.toggle('on', v); },
  };
}
