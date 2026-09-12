// Verifica o "token" do reCAPTCHA Enterprise enviado pelo browser,
// contactando o Google diretamente do servidor (as credenciais nunca podem
// ir para o browser). Usa a API REST diretamente (sem instalar a biblioteca
// oficial do Google), pedindo uma "avaliação" (assessment) do token.
export async function POST(request) {
  try {
    const { token, action } = await request.json();
    if (!token) {
      return Response.json({ success: false, error: 'Falta o token do CAPTCHA' }, { status: 400 });
    }

    const apiKey = process.env.RECAPTCHA_API_KEY;
    const projectId = process.env.RECAPTCHA_PROJECT_ID;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!apiKey || !projectId || !siteKey) {
      return Response.json({ success: false, error: 'CAPTCHA não configurado no servidor' }, { status: 500 });
    }

    const assessmentRes = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            token,
            siteKey,
            ...(action ? { expectedAction: action } : {}),
          },
        }),
      }
    );
    const data = await assessmentRes.json();

    // A resposta diz se o token é válido, e dá uma pontuação de 0 (provável
    // robô) a 1 (provável humano). Um valor à volta de 0.5 costuma ser um
    // bom ponto de corte para a maioria dos sites.
    const valid = !!data?.tokenProperties?.valid;
    const score = data?.riskAnalysis?.score ?? 0;
    const success = valid && score >= 0.5;

    return Response.json({ success, score });
  } catch (err) {
    console.error('Erro ao verificar reCAPTCHA:', err);
    return Response.json({ success: false, error: 'Erro ao verificar' }, { status: 500 });
  }
}
