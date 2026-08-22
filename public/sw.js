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
  // Só intervém em pedidos do próprio site — pedidos para serviços externos
  // (Google Analytics, mapas, etc.) passam diretamente pela rede, sem o
  // service worker se meter, para nunca causar um erro aqui por causa de
  // algo que nem está relacionado com o site em si.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 503 }))
  );
});
