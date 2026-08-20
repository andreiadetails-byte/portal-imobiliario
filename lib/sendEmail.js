import nodemailer from 'nodemailer';

// Envia emails através da tua própria conta Gmail, em vez do Resend
// (que só entrega a ti próprio, sem um domínio verificado).
//
// Precisas de definir, no .env.local e no Netlify:
//   GMAIL_USER = o teu email Gmail (ex: andreiadetails@gmail.com)
//   GMAIL_APP_PASSWORD = uma "palavra-passe de aplicação" gerada na tua conta Google
//                        (não é a password normal — ver instruções em separado)

let transporter;

function getTransporter() {
  if (!transporter) {
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

export async function sendEmail({ to, subject, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('GMAIL_USER ou GMAIL_APP_PASSWORD não estão definidos.');
    return { error: 'Configuração de email em falta.' };
  }

  try {
    await getTransporter().sendMail({
      from: `More·ada — Não responder <${process.env.GMAIL_USER}>`,
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
