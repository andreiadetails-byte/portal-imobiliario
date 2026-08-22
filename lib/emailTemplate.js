// Molde comum para todos os emails do site — cabeçalho com o logótipo,
// tira de azulejo (a mesma do site), e rodapé com o link e aviso legal.
// Cada rota de notificação só precisa de fornecer o "miolo" (bodyHtml).

const SITE_URL = 'https://portalimobiliario.netlify.app';

function tileStripHtml() {
  // Recria a faixa de azulejo em xadrez (verde-sálvia + dourado), usando
  // uma tabela HTML — a maioria dos clientes de email não suporta bem
  // gradientes CSS modernos, por isso uma tabela com células é mais fiável.
  const colors = ['#7E8F6A', '#D8C9A3'];
  let cells = '';
  for (let i = 0; i < 24; i++) {
    cells += `<td style="width:4.2%; height:8px; background:${colors[i % 2]};"></td>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}

export function renderEmail({ preheader = '', bodyHtml, ctaText, ctaUrl }) {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background:#F1E8D6; font-family: Arial, Helvetica, sans-serif;">
  <span style="display:none; font-size:1px; color:#F1E8D6; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1E8D6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background:#FFFFFF; border-radius: 10px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px 16px; text-align:center;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #332E22;">
                More<span style="color:#7E8F6A;">&middot;</span>ada
              </span>
            </td>
          </tr>
          <tr><td>${tileStripHtml()}</td></tr>
          <tr>
            <td style="padding: 28px 32px 8px; color:#332E22; font-size:14.5px; line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaText && ctaUrl ? `
          <tr>
            <td style="padding: 8px 32px 28px;">
              <a href="${ctaUrl}" style="display:inline-block; background:#5A6B49; color:#FFFFFF; text-decoration:none; font-weight:600; font-size:14px; padding: 12px 24px; border-radius: 6px;">
                ${ctaText}
              </a>
            </td>
          </tr>` : '<tr><td style="padding-bottom:20px;"></td></tr>'}
          <tr><td>${tileStripHtml()}</td></tr>
          <tr>
            <td style="padding: 18px 32px 28px; text-align:center;">
              <p style="font-size:11.5px; color:#6b634e; margin: 0 0 6px;">
                <a href="${SITE_URL}" style="color:#6b634e; text-decoration:underline;">More·ada</a> — Portal imobiliário Portugal
              </p>
              <p style="font-size:10.5px; color:#a49b84; margin:0;">
                Este é um email automático — não responda diretamente a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Cartão de imóvel, para incluir dentro do "miolo" de emails que falam de
// um anúncio específico (lead, chat, pesquisa guardada).
export function propertyCardHtml({ typology, address, price, businessType, photoUrl, propertyId }) {
  const priceLabel = price
    ? `${Number(price).toLocaleString('pt-PT')} ${businessType === 'Arrendamento' ? '€/mês' : '€'}`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1E8D6; border-radius:8px; overflow:hidden; margin: 14px 0;">
      <tr>
        ${photoUrl ? `
        <td style="width:120px; vertical-align:top;">
          <img src="${photoUrl}" alt="${typology || ''}" width="120" height="90" style="display:block; width:120px; height:90px; object-fit:cover;">
        </td>` : ''}
        <td style="padding: 12px 14px; vertical-align:middle;">
          <div style="font-size:13.5px; font-weight:700; color:#332E22;">${typology || ''} · ${address || ''}</div>
          ${priceLabel ? `<div style="font-size:13px; color:#5A6B49; font-weight:600; margin-top:4px;">${priceLabel}</div>` : ''}
          ${propertyId ? `<div style="margin-top:6px;"><a href="${SITE_URL}/property/${propertyId}" style="font-size:12px; color:#5A6B49;">Ver anúncio completo →</a></div>` : ''}
        </td>
      </tr>
    </table>
  `;
}

export { SITE_URL };
