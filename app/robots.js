export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/assinatura', '/reset-password'],
    },
    sitemap: 'https://portalimobiliario.netlify.app/sitemap.xml',
  };
}
