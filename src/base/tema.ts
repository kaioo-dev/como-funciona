// Estilos (paletas) dos vídeos. Regra de cor: neutros para o mundo, UM acento para o que importa.
// Cada perfil escolhe o seu em src/estilo.ts. Para criar um estilo novo, copie um destes e troque as cores
// (a skill `estilo` faz isso com você e mostra prévias antes).

export type Tema = {
  nome: 'creme' | 'escuro'; // lógica de luz das peças: 'creme' = fundo claro, 'escuro' = fundo escuro
  fundo: string; // fundo infinito (e névoa do horizonte)
  ceu: string; // topo do degradê do céu
  chao: string;
  branco: string; // base dos objetos grandes (balcões, caixas)
  corpo: string; // bonecos e barras neutras
  tinta: string; // traços e detalhes que contrastam com o fundo
  linha: string; // linhas finas sobre o fundo
  acento: string; // A cor do que importa. Só uma.
  areia: string; // madeira, comida
  objeto: string; // objetos principais claros (avião, escada, cartões)
  objetoClaro: string; // o objeto mais claro da cena
  objetoEscuro: string; // assentos, bases, objetos de fundo
  pessoa: string; // multidão neutra
  luzCor: string; // cor da luz principal
  ceuLuz: string; // cor da luz que vem do céu
  texto: string; // texto forte nos cartões
  textoSuave: string; // rótulos em fonte mono
  cartao: string; // fundo dos cartões e placares
  cartaoBorda: string;
  marca: string; // linha "SÉRIE · TEMA" no topo
  pilulaFundo: string;
  pilulaTexto: string;
  legendaFundo: string;
  legendaAceso: string;
  legendaApagado: string;
  etiquetaFundo: string;
  etiquetaTexto: string;
  etiquetaSub: string;
  luz: number;
  ambiente: number;
  sombra: number;
};

// Padrão do kit: escuro, objetos chumbo e claros, acento laranja.
export const ESCURO: Tema = {
  nome: 'escuro',
  fundo: '#11151B', ceu: '#1A2130', chao: '#151A21',
  branco: '#2C333D', corpo: '#5F6977', tinta: '#D3DAE3', linha: '#D3DAE3', acento: '#FF6A1F', areia: '#C89B5E',
  objeto: '#C9D0D9', objetoClaro: '#E9ECF0', objetoEscuro: '#3A4350', pessoa: '#9AA5B4',
  luzCor: '#DCE6F5', ceuLuz: '#9FB2CC',
  texto: '#F4F6F8', textoSuave: '#8A94A3', cartao: 'rgba(11,14,18,0.94)', cartaoBorda: '#2A313B', marca: 'rgba(231,235,240,0.5)',
  pilulaFundo: '#1C222B', pilulaTexto: '#EEF1F5',
  legendaFundo: 'rgba(24,29,36,0.94)', legendaAceso: '#FFFFFF', legendaApagado: '#6E7785',
  etiquetaFundo: 'rgba(24,29,36,0.92)', etiquetaTexto: '#EEF1F5', etiquetaSub: '#8C96A5',
  luz: 1.9, ambiente: 0.42, sombra: 0.35,
};

// Claro e quente: papel creme, objetos brancos, traço preto.
export const CREME: Tema = {
  nome: 'creme',
  fundo: '#EEE8DC', ceu: '#F6F1E7', chao: '#EEE8DC',
  branco: '#FBF8F2', corpo: '#7A766F', tinta: '#1E1D1B', linha: '#1E1D1B', acento: '#FF5A1F', areia: '#E3C58F',
  objeto: '#FBF8F2', objetoClaro: '#FFFFFF', objetoEscuro: '#CFC6B6', pessoa: '#8E877C',
  luzCor: '#FFF1DC', ceuLuz: '#FFF6E6',
  texto: '#1E1D1B', textoSuave: '#7A746A', cartao: 'rgba(255,253,248,0.96)', cartaoBorda: '#E2DACB', marca: 'rgba(30,29,27,0.5)',
  pilulaFundo: '#1E1D1B', pilulaTexto: '#F4EFE6',
  legendaFundo: '#1E1D1B', legendaAceso: '#FFFFFF', legendaApagado: '#8E8A83',
  etiquetaFundo: 'rgba(251,248,242,0.94)', etiquetaTexto: '#1E1D1B', etiquetaSub: '#6B6760',
  luz: 2.6, ambiente: 0.4, sombra: 0.14,
};

// Claro e moderno: lavanda, objetos brancos, acento roxo.
export const LAVANDA: Tema = {
  nome: 'creme',
  fundo: '#ECE8FA', ceu: '#FAF8FF', chao: '#ECE8FA',
  branco: '#FFFFFF', corpo: '#A69CD6', tinta: '#2B2350', linha: '#2B2350', acento: '#7C3AED', areia: '#F5C78E',
  objeto: '#FFFFFF', objetoClaro: '#FFFFFF', objetoEscuro: '#CBC2F0', pessoa: '#A69CD6',
  luzCor: '#FFFFFF', ceuLuz: '#FFFFFF',
  texto: '#2B2350', textoSuave: '#7A7299', cartao: 'rgba(255,255,255,0.96)', cartaoBorda: '#DCD4FA', marca: 'rgba(43,35,80,0.55)',
  pilulaFundo: '#2B2350', pilulaTexto: '#F6F3FF',
  legendaFundo: '#2B2350', legendaAceso: '#FFFFFF', legendaApagado: '#9A93B8',
  etiquetaFundo: 'rgba(255,255,255,0.95)', etiquetaTexto: '#2B2350', etiquetaSub: '#7A7299',
  luz: 2.4, ambiente: 0.5, sombra: 0.12,
};

// Escuro e vibrante: azul-marinho, objetos azulados, acento amarelo.
export const OCEANO: Tema = {
  nome: 'escuro',
  fundo: '#0B1630', ceu: '#16295A', chao: '#0E1B3A',
  branco: '#1C2C55', corpo: '#4A5F96', tinta: '#E8EEFF', linha: '#E8EEFF', acento: '#FFC83D', areia: '#D9A85E',
  objeto: '#C9D6F2', objetoClaro: '#E6EDFF', objetoEscuro: '#24376A', pessoa: '#8FA3D1',
  luzCor: '#E1E9FF', ceuLuz: '#9FB6E8',
  texto: '#F2F5FF', textoSuave: '#8C9CC4', cartao: 'rgba(8,16,38,0.94)', cartaoBorda: '#22345F', marca: 'rgba(230,236,255,0.5)',
  pilulaFundo: '#13224A', pilulaTexto: '#F2F5FF',
  legendaFundo: 'rgba(14,26,58,0.94)', legendaAceso: '#FFFFFF', legendaApagado: '#6F80AD',
  etiquetaFundo: 'rgba(14,26,58,0.92)', etiquetaTexto: '#F2F5FF', etiquetaSub: '#8C9CC4',
  luz: 1.9, ambiente: 0.45, sombra: 0.35,
};

// Estilos prontos, por nome (usados nas prévias: PROPS='{"estilo":"lavanda"}').
export const ESTILOS: Record<string, Tema> = {escuro: ESCURO, creme: CREME, lavanda: LAVANDA, oceano: OCEANO};

export const FONTE = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
export const MONO = 'Menlo, "SF Mono", ui-monospace, monospace';
