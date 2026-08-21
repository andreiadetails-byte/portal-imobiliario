import nodemailer from 'nodemailer';

// Envia emails através de uma conta de email a sério (SMTP), em vez do
// Resend (que só entrega a ti próprio, sem um domínio verificado).
//
// Para usares o teu email profissional (ex: geral@moreada.pt), define no
// .env.local e no Netlify:
//   SMTP_HOST = o servidor SMTP do teu fornecedor (ex: smtp.zoho.com, smtp.office365.com — pergunta a quem te deu o email)
//   SMTP_PORT = normalmente 587 (ou 465, se o fornecedor pedir "SSL")
//   SMTP_SECURE = "true" se usares a porta 465, "false" se usares a 587
//   SMTP_USER = geral@moreada.pt
//   SMTP_PASSWORD = a password desse email (ou uma "palavra-passe de aplicação", se o fornecedor pedir)
//
// Se não definires estas variáveis, continua a usar o Gmail antigo como
// alternativa (GMAIL_USER + GMAIL_APP_PASSWORD), para não quebrar nada.

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

function getSenderAddress() {
  return process.env.SMTP_USER || process.env.GMAIL_USER;
}

export async function sendEmail({ to, subject, html }) {
  const senderEmail = getSenderAddress();
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;
  const hasGmailConfig = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

  if (!hasSmtpConfig && !hasGmailConfig) {
    console.error('Configuração de email em falta (nem SMTP nem Gmail definidos).');
    return { error: 'Configuração de email em falta.' };
  }

  try {
    await getTransporter().sendMail({
      from: `More·ada — Não responder <${senderEmail}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('Erro ao enviar email:', err.message);
    return { error: err.message };
  }
}
