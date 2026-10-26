// O formato de uma edição (projetos/<AAAA-MM-DD>/edicao.json). O Claude monta este arquivo a partir do auto.json
// (dados automáticos) e da apuração do dia; o vídeo só desenha o que está aqui. Bloco sem dado = bloco fora.

export type Palavra = {w: string; s: number; e: number};

export type Periodo = {nome: string; chuva_mm: number; chance: number; temp: number};
export type Hora = {hora: string; temp: number; sensacao: number; chance: number; chuva_mm: number; uv: number; rajada: number; umidade: number};
export type Amanha = {condicao: string; min: number; max: number; chance_max: number; chuva_mm: number};
export type DadosTempo = {
  min: number;
  max: number;
  chuva_mm: number;
  chance_max: number;
  uv_max: number;
  nascer: string;
  por: string;
  periodos: Periodo[];
  fonte: string;
  condicao?: string;
  horas?: Hora[];
  uv_alto?: [string, string] | null;
  chuva_pico?: {hora: string; chance: number};
  guarda_chuva?: boolean;
  rajada_max?: {hora: string; kmh: number};
  amanha?: Amanha;
};
export type DadosAr = {pm25_media: number; nivel: string; fonte: string};
export type Posto = {posto: string; endereco: string; bairro: string; preco: number; coleta: string};
export type DadosPostos = {produto: string; mais_barato: Posto; mais_caro: Posto; pesquisados: number; tanque: number; semana: [string, string]};
export type Extremo = {hora: string; nivel: number};
export type DadosMare = {altas: Extremo[]; baixas: Extremo[]; serie: Extremo[]; fonte: string};
export type ItemCombustivel = {nome: string; medio: number; min: number; max: number; postos: number; unidade: string; variacao: number | null};
export type DadosCombustivel = {semana: [string, string]; itens: ItemCombustivel[]; fonte: string};

// item de lista: aparece no cartão e, se tiver bairro, vira pin no mapa
export type Item = {texto: string; detalhe?: string; bairro?: string};

// `manchete`: o texto grande que estala no topo do mapa (2–4 palavras, ex.: "SEM GUARDA-CHUVA", "UV 8 AO MEIO-DIA")
export type Bloco = (
  | {tipo: 'abertura'; fala: string}
  | {tipo: 'resumo'; fala: string; dados: DadosTempo}
  | {tipo: 'hora'; fala: string; dados: DadosTempo}
  | {tipo: 'sol'; fala: string; dados: DadosTempo; ar?: DadosAr}
  | {tipo: 'amanha'; fala: string; dados: Amanha}
  | {tipo: 'postos'; fala: string; dados: DadosPostos}
  | {tipo: 'curiosidade'; fala: string; titulo: string; marcos: {ano: string; texto: string}[]; destaque?: string; fonte: string}
  | {tipo: 'tempo'; fala: string; dados: DadosTempo}
  | {tipo: 'mare'; fala: string; dados: DadosMare}
  | {tipo: 'combustivel'; fala: string; dados: DadosCombustivel}
  // alertas, falta de luz/água, obras, farmácia de plantão, agenda, vagas…
  | {tipo: 'lista'; fala: string; rotulo: string; titulo: string; itens: Item[]; fonte: string; alerta?: boolean}
  // o tema do dia (texto + número opcional)
  | {tipo: 'tema'; fala: string; rotulo: string; titulo: string; linhas: {texto: string; destaque?: boolean}[]; numero?: {valor: string; rotulo: string}; fonte: string}
  | {tipo: 'patrocinio'; fala: string; nome: string; frase: string; imagem?: string}
  | {tipo: 'encerramento'; fala: string}
) & {manchete?: string};

export type Edicao = {
  data: string; // AAAA-MM-DD
  diaSemana: string; // SEGUNDA, TERÇA…
  pasta?: string; // pasta em projetos/ (padrão: a data)
  narracao?: string; // 'audio/narracao-norm.wav' quando houver narração
  trilha?: string | null; // 'sfx/trilha.wav' (opcional)
  palavras?: Palavra[]; // tempo de cada palavra (tools/alinhar_roteiro.py); sem isto o tempo é estimado
  sons?: boolean; // efeitos (whoosh na troca de bloco, pop na manchete) de projetos/_sons/
  blocos: Bloco[];
};
