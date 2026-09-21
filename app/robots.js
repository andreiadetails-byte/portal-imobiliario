export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard', '/admin', '/assinatura', '/reset-password',
        '/perfil', '/favorites', '/chat', '/mensagens-suporte',
        '/testemunho-resposta', '/comparar', '/api/',
      ],
    },
    sitemap: 'https://moreada.pt/sitemap.xml',
  };
}
