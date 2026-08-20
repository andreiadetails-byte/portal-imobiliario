// Verifica o "token" do reCAPTCHA enviado pelo browser, contactando o Google
// diretamente do servidor (a chave secreta nunca pode ir para o browser).
export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return Response.json({ success: false, error: 'Falta o token do CAPTCHA' }, { status: 400 });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      return Response.json({ success: false, error: 'CAPTCHA não configurado no servidor' }, { status: 500 });
    }

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });
    const data = await res.json();

    return Response.json({ success: !!data.success });
  } catch (err) {
    console.error('Erro ao verificar reCAPTCHA:', err);
    return Response.json({ success: false, error: 'Erro ao verificar' }, { status: 500 });
  }
}
