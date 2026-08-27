/** @type {import('next').NextConfig} */
const nextConfig = {
  // O "sharp" (usado para redimensionar/otimizar as fotos antes de irem
  // para o Cloudflare R2) usa um programa próprio do sistema operativo por
  // baixo — sem isto, o Next.js pode empacotá-lo de forma incorreta para o
  // servidor, e a função falha em silêncio (erro genérico, sem detalhe).
  serverExternalPackages: ['sharp'],
  async headers() {
    return [
      {
        // Aplica-se a todas as páginas do site
        source: '/:path*',
        headers: [
          {
            // Impede que o site seja mostrado dentro de uma "moldura" (iframe)
            // noutro site — protege contra ataques de "clickjacking".
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            // Impede que o browser tente "adivinhar" o tipo de um ficheiro
            // diferente do que realmente é — reduz o risco de ficheiros
            // maliciosos disfarçados de imagens, por exemplo.
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Controla quanta informação sobre a página de onde a pessoa veio
            // é partilhada com outros sites, quando clica num link.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Desativa o acesso a câmara/microfone/localização por sites
            // incorporados no teu, e restringe o pagamento só ao teu próprio site.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          {
            // A proteção mais forte contra código malicioso injetado (XSS) —
            // diz ao browser exatamente que sítios têm permissão para correr
            // scripts, carregar imagens, etc. Inclui só os serviços que o site
            // já usa (Google, Supabase, mapas, etc.) — qualquer coisa fora
            // desta lista é bloqueada automaticamente pelo browser.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://www.google.com https://www.gstatic.com https://overpass-api.de https://api.qrserver.com https://generativelanguage.googleapis.com https://*.tile.openstreetmap.org https://earth.google.com",
              "frame-src https://www.google.com",
              "media-src 'self' https://*.supabase.co",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
