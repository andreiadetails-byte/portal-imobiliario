// "Contas profissionais" (agência, promotor) partilham as mesmas
// regras de negócio: mensalidade, limite de 50 anúncios, licença AMI, etc.
// Só a conta "particular" fica de fora, com as regras mais simples (grátis,
// limite de 3 anúncios).
export function isProfessionalAccount(accountType) {
  return accountType === 'agencia' || accountType === 'promotor';
}

export function accountTypeLabel(accountType) {
  const labels = {
    agencia: 'Agência',
    promotor: 'Promotor imobiliário',
    particular: 'Particular',
  };
  return labels[accountType] || 'Particular';
}
