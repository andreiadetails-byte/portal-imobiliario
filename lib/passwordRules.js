// Regra de segurança para passwords: pelo menos 8 caracteres, com maiúscula,
// minúscula e número. Usada em todos os sítios onde a pessoa define uma
// password nova (registo, recuperação, mudança no perfil).
export function isPasswordValid(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export const PASSWORD_RULES_TEXT = 'A palavra-passe precisa de ter pelo menos 8 caracteres, incluindo uma maiúscula, uma minúscula e um número.';
