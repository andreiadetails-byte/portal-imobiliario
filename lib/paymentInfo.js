// Dados usados nos ecrãs de pagamento (destaque de anúncios e subscrição de agências).
// Substitui pelos teus dados reais antes de publicares o site.
export const PAYMENT_INFO = {
  activationFee: 4,
  dailyFee: 0.9,
  subscriptionFee: 15, // € por mês, para contas de agência
  subscriptionListingsLimit: 50,
  subscriptionEnforced: true, // agências têm de pagar e anexar comprovativo para a conta ficar ativa
  featuredEnforced: false, // <-- muda para true quando quiseres voltar a cobrar pelo destaque
  iban: 'LT02 3250 0948 1033 0375',
  bic: 'REVOLT21',
  accountHolder: 'Palavras Rápidas Unipessoal, Lda',
  companyNipc: '518114481',
};
