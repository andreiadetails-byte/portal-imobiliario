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

self.addEventListener('fetch', () => {
  // Não faz nada de especial com nenhum pedido — deixa tudo seguir o
  // caminho normal da rede, sem qualquer interferência. A única razão
  // deste ficheiro existir é o Chrome exigir um "service worker" com um
  // ouvinte de "fetch" registado, para considerar o site instalável.
  // Não chamar respondWith() aqui é intencional: assim, o browser trata
  // o pedido exatamente como se não houvesse service worker nenhum.
});
