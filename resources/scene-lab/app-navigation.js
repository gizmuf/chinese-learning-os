/* Shared application navigation for direct links and the in-app Learning Lab. */
(() => {
  const embedded = new URLSearchParams(location.search).get('embedded') === '1' && window.parent !== window;
  if (embedded) document.documentElement.classList.add('in-chineseos');
  const bundled = location.pathname.startsWith('/design-references/scene-lab/');
  const appOrigin = bundled ? location.origin : 'https://chinese-os-study.gizmuf.chatgpt.site';
  const home = new URL('/?study=studio', appOrigin).href;
  const root = new URL(location.pathname.includes('/teacher/') ? '../' : './', location.href);
  const pages = [
    ['world3d.html?v=abfb270', '3D room'],
    ['teacher/index.html?v=1793706', 'Guided speaking'],
    ['journey.html', '2D journey'],
  ];
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('body > header');
    if (!header) return;
    const brand = header.querySelector('.brand');
    if (brand) {
      brand.href = home;
      brand.setAttribute('aria-label', 'ChineseOS · Back to application');
      brand.target = '_top';
    }
    const nav = document.createElement('nav');
    nav.className = 'scene-app-nav';
    nav.setAttribute('aria-label', 'ChineseOS navigation');
    const back = document.createElement('a');
    back.href = home;
    back.target = '_top';
    back.className = 'scene-app-back';
    back.textContent = '← Back to ChineseOS';
    nav.append(back);
    for (const [path, label] of pages) {
      const link = document.createElement('a');
      link.href = new URL(path, root).href;
      link.textContent = label;
      if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
      nav.append(link);
    }
    header.querySelector('.prototype, .back')?.remove();
    header.append(nav);
  });
})();
