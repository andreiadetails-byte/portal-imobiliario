import { NextResponse } from 'next/server';

// Bloqueia o acesso a TODO o site com uma password simples, até ao
// lançamento oficial (dia 15). Isto é temporário — depois de publicares
// oficialmente, remove este ficheiro (ou desliga a variável de ambiente
// SITE_PASSWORD) para voltar a ficar público.
//
// Como funciona: a pessoa tem de escrever a password certa num pedido
// (via autenticação básica do navegador — aparece uma janela pop-up a
// pedir utilizador/password). Sem a password certa, não vê nada do site.

export function middleware(request) {
  const sitePassword = process.env.SITE_PASSWORD;

  // Se a variável não estiver definida, o site fica público como antes
  // (para nunca bloqueares sem querer, se esqueceres de configurar isto).
  if (!sitePassword) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const encoded = authHeader.split(' ')[1] || '';
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [, password] = decoded.split(':');
    if (password === sitePassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="More·ada"' },
  });
}

export const config = {
  // Aplica-se a tudo, exceto ficheiros estáticos internos do Next.js
  // (senão o próprio site deixava de conseguir carregar corretamente).
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
