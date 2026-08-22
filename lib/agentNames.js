// Nomes fictícios usados pelos "agentes" do balão de apoio — partilhado entre
// o balão em si e a página de mensagens de suporte, para conseguirmos usar o
// artigo certo ("o"/"a Agente") mesmo depois de gravado, sem guardar o género
// à parte na base de dados (basta veri­ficar o primeiro nome).

export const NOMES_F = ['Beatriz', 'Inês', 'Mariana', 'Catarina', 'Carolina', 'Sofia', 'Joana', 'Rita', 'Leonor', 'Matilde'];
export const NOMES_M = ['Tiago', 'Rui', 'André', 'Miguel', 'Diogo', 'Bruno', 'Pedro', 'Ricardo', 'Nuno', 'Gonçalo'];
export const APELIDOS = ['Ferreira', 'Costa', 'Santos', 'Silva', 'Pereira', 'Oliveira', 'Rodrigues', 'Martins'];

export function randomAgentName() {
  const isFemale = Math.random() < 0.5;
  const nomes = isFemale ? NOMES_F : NOMES_M;
  const nome = nomes[Math.floor(Math.random() * nomes.length)];
  const apelido = APELIDOS[Math.floor(Math.random() * APELIDOS.length)];
  return { fullName: `${nome} ${apelido}`, isFemale };
}

// Dado um nome completo já gravado (ex: "Mariana Santos"), devolve
// "Agente Mariana Santos" com o artigo certo antes — "a Agente" ou "o Agente".
export function agentLabel(fullName) {
  if (!fullName) return 'Agente';
  const firstName = fullName.split(' ')[0];
  const isFemale = NOMES_F.includes(firstName);
  return `${isFemale ? 'a' : 'o'} Agente ${fullName}`;
}
