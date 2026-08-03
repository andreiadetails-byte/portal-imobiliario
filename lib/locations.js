export const distritos = [
  'Açores', 'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora',
  'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Madeira', 'Portalegre', 'Porto', 'Santarém',
  'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
];

export const concelhosPorDistrito = {
  'Açores': ['Ponta Delgada', 'Angra do Heroísmo', 'Horta'],
  'Aveiro': ['Aveiro', 'Espinho', 'Santa Maria da Feira', 'Ovar'],
  'Beja': ['Beja', 'Odemira', 'Moura'],
  'Braga': ['Braga', 'Guimarães', 'Barcelos', 'Vila Nova de Famalicão'],
  'Bragança': ['Bragança', 'Mirandela'],
  'Castelo Branco': ['Castelo Branco', 'Covilhã'],
  'Coimbra': ['Coimbra', 'Figueira da Foz', 'Cantanhede'],
  'Évora': ['Évora', 'Estremoz', 'Montemor-o-Novo'],
  'Faro': ['Faro', 'Albufeira', 'Lagos', 'Portimão', 'Loulé', 'Tavira'],
  'Guarda': ['Guarda', 'Seia'],
  'Leiria': ['Leiria', 'Caldas da Rainha', 'Peniche', 'Nazaré', 'Pombal'],
  'Lisboa': ['Lisboa', 'Cascais', 'Oeiras', 'Sintra', 'Odivelas', 'Loures', 'Amadora', 'Mafra'],
  'Madeira': ['Funchal', 'Câmara de Lobos'],
  'Portalegre': ['Portalegre', 'Elvas'],
  'Porto': ['Porto', 'Vila Nova de Gaia', 'Matosinhos', 'Maia', 'Gondomar', 'Valongo', 'Santo Tirso'],
  'Santarém': ['Santarém', 'Torres Novas', 'Tomar', 'Abrantes'],
  'Setúbal': ['Setúbal', 'Almada', 'Sesimbra', 'Barreiro', 'Montijo'],
  'Viana do Castelo': ['Viana do Castelo', 'Ponte de Lima'],
  'Vila Real': ['Vila Real', 'Chaves'],
  'Viseu': ['Viseu', 'Tondela', 'Lamego'],
};

// Freguesias só estão disponíveis para os concelhos maiores, por agora.
// Nos restantes, a pesquisa fica pelo concelho (nível acima).
export const freguesiasPorConcelho = {
  'Lisboa': [
    'Alvalade', 'Areeiro', 'Arroios', 'Avenidas Novas', 'Belém', 'Benfica',
    'Campo de Ourique', 'Campolide', 'Carnide', 'Estrela', 'Marvila', 'Parque das Nações',
    'Santa Maria Maior', 'Santo António', 'São Domingos de Benfica', 'São Vicente',
  ],
  'Porto': ['Bonfim', 'Campanhã', 'Cedofeita', 'Lordelo do Ouro e Massarelos', 'Paranhos', 'Ramalde'],
  'Cascais': ['Cascais e Estoril', 'Alcabideche', 'Carcavelos e Parede', 'São Domingos de Rana'],
  'Sintra': ['Sintra', 'Queluz e Belas', 'Agualva e Mira-Sintra', 'Rio de Mouro', 'Algueirão-Mem Martins'],
  'Braga': ['São Vicente', 'São José de São Lázaro', 'Maximinos', 'Real'],
  'Faro': ['Faro (Sé e São Pedro)', 'Montenegro'],
  'Coimbra': ['Sé Nova', 'Santo António dos Olivais', 'Santa Clara'],
  'Vila Nova de Gaia': ['Santa Marinha e São Pedro da Afurada', 'Mafamude e Vilar do Paraíso', 'Canidelo'],
  'Setúbal': ['Setúbal (São Julião, Nossa Senhora da Anunciada e Santa Maria da Graça)'],
  'Matosinhos': ['Matosinhos e Leça da Palmeira', 'Perafita, Lavra e Santa Cruz do Bispo'],
};
