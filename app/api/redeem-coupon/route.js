import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Verifica e regista o uso de um código de cupão, no servidor — impede que
// alguém contorne a verificação (que antes só acontecia no navegador) e
// impede que o MESMO email use o mesmo cupão mais do que uma vez, criando
// contas novas indefinidamente para nunca pagar mensalidade.
const COUPON_CODES = { MOREADA3: 3 };

export async function POST(request) {
  try {
    const { email, couponCode } = await request.json();
    if (!email || !couponCode) {
      return NextResponse.json({ months: 0 });
    }

    const normalizedCode = couponCode.trim().toUpperCase();
    const months = COUPON_CODES[normalizedCode];
    if (!months) {
      return NextResponse.json({ months: 0 });
    }

    const { error } = await supabaseAdmin.from('coupon_redemptions').insert({
      email: email.trim().toLowerCase(),
      coupon_code: normalizedCode,
    });

    if (error) {
      // Já usou este cupão antes (viola a regra de "único por email") —
      // não dá os meses extra, mas também não impede o registo em si.
      return NextResponse.json({ months: 0, alreadyUsed: true });
    }

    return NextResponse.json({ months });
  } catch (err) {
    return NextResponse.json({ months: 0, error: err.message });
  }
}
