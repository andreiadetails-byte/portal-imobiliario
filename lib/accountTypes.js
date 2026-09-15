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
