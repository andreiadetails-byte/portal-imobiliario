// Service worker mínimo — o Chrome exige que exista um, para considerar o
// site "instalável" e mostrar o aviso automático. Não faz cache agressivo
// nem funciona offline (isso poderia causar problemas com dados que mudam
// muito, como os anúncios) — só cumpre o requisito técnico.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Deixa todos os pedidos passar normalmente, sem cache — o site continua
  // a funcionar exatamente como antes, isto só "ativa" a instalação.
  event.respondWith(fetch(event.request));
});
