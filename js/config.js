// Configuração do site. Se hospedar no GitHub Pages (usuario.github.io/repo),
// owner/repo são detectados automaticamente; senão valem os valores abaixo.
const DEFAULTS = {
  siteName: 'Transmissão',
  owner: 'gabrielescorelguerra',
  repo: 'hub-transmissao',
  branch: 'main',
  contentDir: 'content',   // onde ficam sidebar.json e as páginas .md
  assetsDir: 'assets/img', // onde ficam as imagens enviadas pelo editor
};

function detect() {
  const c = { ...DEFAULTS };
  try {
    const host = location.hostname;
    if (host.endsWith('.github.io')) {
      c.owner = host.split('.')[0];
      const first = location.pathname.split('/').filter(Boolean)[0];
      if (first && !first.includes('.')) c.repo = first;
    }
  } catch { /* fora do navegador (testes) */ }
  return c;
}

export const CONFIG = detect();
export const MANIFEST_PATH = `${CONFIG.contentDir}/sidebar.json`;
export const pagePath = (p) => `${CONFIG.contentDir}/${p}.md`;
