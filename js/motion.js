// Movimento do site: preferência de animações (ligadas/desligadas) e a troca suave de telas.
// Só usa opacidade + transform (acelerado por GPU), sem capturas de tela borradas.
export const EASE = 'cubic-bezier(.22, .8, .24, 1)';
export const SPRING = 'cubic-bezier(.3, 1.25, .45, 1)';
const KEY = 'hub.motion';

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const motionOn = () => document.documentElement.dataset.motion !== 'off';

/** Aplica a preferência salva; sem preferência, respeita "reduzir movimento" do sistema. */
export function initMotion() {
  const saved = read();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.dataset.motion = saved === 'on' || saved === 'off' ? saved : (reduced ? 'off' : 'on');
}
export function setMotion(on) {
  document.documentElement.dataset.motion = on ? 'on' : 'off';
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignora */ }
  return on;
}

/**
 * Troca de conteúdo: o antigo some (leve, para cima) → `update()` troca o DOM e devolve o elemento novo
 * (ou nada, se for o mesmo) → o novo sobe suavemente. Sem animações ligadas, só troca.
 */
export async function swapWith(outEl, update) {
  if (!motionOn() || !outEl?.animate) { await update(); return; }
  try { await outEl.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).finished; } catch { /* cancelada */ }
  const inEl = (await update()) || outEl;
  outEl.getAnimations?.().forEach((a) => a.cancel());
  inEl.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
}
