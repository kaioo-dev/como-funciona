// O formato de uma edição (projetos/<AAAA-MM-DD>/edicao.json). O Claude monta este arquivo a partir do auto.json
// (dados automáticos) e da apuração do dia; o vídeo só desenha o que está aqui. Bloco sem dado = bloco fora.

export type Palavra = {w: string; s: number; e: number};

export type Periodo = {nome: string; chuva_mm: number; chance: number; temp: number};
export type DadosTempo = {min: number; max: number; chuva_mm: number; chance_max: number; uv_max: number; nascer: string; por: string; periodos: Periodo[]; fonte: string};
export type Extremo = {hora: string; nivel: number};
export type DadosMare = {altas: Extremo[]; baixas: Extremo[]; serie: Extremo[]; fonte: string};
export type ItemCombustivel = {nome: string; medio: number; min: number; max: number; postos: number; unidade: string; variacao: number | null};
export type DadosCombustivel = {semana: [string, string]; itens: ItemCombustivel[]; fonte: string};

// item de lista: aparece no cartão e, se tiver bairro, vira pin no mapa
export type Item = {texto: string; detalhe?: string; bairro?: string};

export type Bloco =
  | {tipo: 'abertura'; fala: string}
  | {tipo: 'tempo'; fala: string; dados: DadosTempo}
  | {tipo: 'mare'; fala: string; dados: DadosMare}
  | {tipo: 'combustivel'; fala: string; dados: DadosCombustivel}
  // alertas, falta de luz/água, obras, farmácia de plantão, agenda, vagas…
  | {tipo: 'lista'; fala: string; rotulo: string; titulo: string; itens: Item[]; fonte: string; alerta?: boolean}
  // o tema do dia (texto + número opcional)
  | {tipo: 'tema'; fala: string; rotulo: string; titulo: string; linhas: {texto: string; destaque?: boolean}[]; numero?: {valor: string; rotulo: string}; fonte: string}
  | {tipo: 'patrocinio'; fala: string; nome: string; frase: string; imagem?: string}
  | {tipo: 'encerramento'; fala: string};

export type Edicao = {
  data: string; // AAAA-MM-DD
  diaSemana: string; // SEGUNDA, TERÇA…
  pasta?: string; // pasta em projetos/ (padrão: a data)
  narracao?: string; // 'audio/narracao-norm.wav' quando houver narração
  trilha?: string | null; // 'sfx/trilha.wav' (opcional)
  palavras?: Palavra[]; // tempo de cada palavra (tools/alinhar_roteiro.py); sem isto o tempo é estimado
  blocos: Bloco[];
};
