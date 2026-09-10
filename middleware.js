import { NextResponse } from 'next/server';

// Bloqueia o acesso a TODO o site até ao lançamento oficial, mostrando uma
// página própria (com a data de lançamento) em vez do popup feio e genérico
// do navegador. Quem souber a password consegue entrar; o acesso fica
// guardado num "cookie" durante 7 dias, para não pedir a password sempre.
//
// Para desativar depois do lançamento: apaga a variável de ambiente
// SITE_PASSWORD no Netlify (ou publica sem ela definida) — o site volta a
// ficar público automaticamente, sem precisares de mexer neste ficheiro.

const COOKIE_NAME = 'morada_access';

function gatePage(error) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>More·ada — Brevemente</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #DCE4CC; font-family: Georgia, 'Times New Roman', serif; color: #332E22; padding: 20px;
  }
  .card {
    background: #fff; border-radius: 16px; padding: 48px 40px; max-width: 440px; width: 100%;
    text-align: center; box-shadow: 0 4px 24px rgba(51,46,34,0.12);
  }
  .logo { font-size: 32px; font-weight: 600; margin: 0 0 8px; }
  .logo span { color: #D8C9A3; }
  .badge {
    display: inline-block; background: #EAF3DE; color: #3D4530; font-family: Arial, sans-serif;
    font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 20px; margin-bottom: 24px;
  }
  h1 { font-size: 22px; font-weight: 600; line-height: 1.35; margin: 0 0 12px; }
  p { font-family: Arial, sans-serif; font-size: 14px; color: #6B6455; line-height: 1.6; margin: 0 0 28px; }
  form { text-align: left; }
  label { font-family: Arial, sans-serif; font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px; }
  input[type="password"] {
    width: 100%; padding: 12px 14px; border: 1.5px solid #D9D2C0; border-radius: 8px;
    font-size: 15px; font-family: Arial, sans-serif; margin-bottom: 14px;
  }
  button {
    width: 100%; padding: 13px; background: #5A6B3E; color: #fff; border: none; border-radius: 8px;
    font-size: 15px; font-weight: 600; font-family: Arial, sans-serif; cursor: pointer;
  }
  .error {
    font-family: Arial, sans-serif; color: #b8452f; font-size: 13px; margin: -6px 0 14px;
  }
</style>
</head>
<body>
  <div class="card">
    <p class="logo">More<span>·</span>ada</p>
    <div class="badge">🚀 Disponível a partir de 15 de setembro, 00h00</div>
    <h1>Estamos quase prontos.</h1>
    <p>O novo portal imobiliário português está em preparação final. Se já tens acesso antecipado, escreve a password abaixo.</p>
    <form method="POST">
      <label for="password">Password de acesso</label>
      <input type="password" id="password" name="password" autofocus />
      ${error ? '<div class="error">Password incorreta. Tenta outra vez.</div>' : ''}
      <button type="submit">Entrar</button>
    </form>
  </div>
</body>
</html>`;
}

export async function middleware(request) {
  const sitePassword = process.env.SITE_PASSWORD;

  // Se a variável não estiver definida, o site fica público (para nunca
  // bloqueares sem querer, se esqueceres de configurar isto).
  if (!sitePassword) {
    return NextResponse.next();
  }

  // Já tem acesso guardado (cookie válido) — deixa passar.
  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value === sitePassword) {
    return NextResponse.next();
  }

  // A pessoa acabou de submeter a password no formulário.
  if (request.method === 'POST') {
    const formData = await request.formData();
    const submitted = formData.get('password');

    if (submitted === sitePassword) {
      const response = NextResponse.redirect(request.url);
      response.cookies.set(COOKIE_NAME, sitePassword, {
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
      return response;
    }

    return new NextResponse(gatePage(true), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new NextResponse(gatePage(false), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  // Aplica-se a tudo, exceto ficheiros estáticos internos do Next.js
  // (senão a própria página de bloqueio deixava de conseguir carregar
  // corretamente — imagens, estilos, etc.).
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
