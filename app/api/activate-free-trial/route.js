import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { isProfessionalAccount } from '../../../lib/accountTypes';
import { PAYMENT_INFO } from '../../../lib/paymentInfo';

// Define o período grátis (subscription_status/subscription_paid_until) de
// uma conta profissional recém-criada. Corre no servidor, com a chave de
// administração — os utilizadores normais não podem escrever diretamente
// nestes campos (por segurança, para ninguém conseguir dar-se a si próprio
// uma subscrição ativa sem pagar mais tarde), por isso o registo pede ao
// servidor para o fazer, logo a seguir a criar a conta.

export async function POST(request) {
  try {
    const { userId, accountType, couponMonths } = await request.json();
    if (!userId || !accountType) {
      return Response.json({ error: 'Faltam dados.' }, { status: 400 });
    }

    if (!PAYMENT_INFO.subscriptionEnforced || !isProfessionalAccount(accountType)) {
      return Response.json({ success: true, applied: false });
    }

    const months = couponMonths > 0 ? couponMonths : 1;
    const freeUntil = new Date();
    freeUntil.setMonth(freeUntil.getMonth() + months);

    await supabaseAdmin.from('profiles').update({
      subscription_status: 'active',
      subscription_paid_until: freeUntil.toISOString().slice(0, 10),
    }).eq('id', userId);

    return Response.json({ success: true, applied: true, months });
  } catch (err) {
    console.error('Erro ao definir período grátis:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
