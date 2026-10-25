// 002. Narguilé — o tabaco não pega fogo: quem queima é só o carvão.
// Um mundo só: uma mesa baixa com o narguilé (que abre ao meio para mostrar o caminho do ar), o coco ao lado,
// o mapa no chão em frente e a sala mais atrás. 24 cenas, uma a cada ~2,9 s, plano diferente a cada corte.
import React from 'react';
import {
  VideoKit,
  CanvasCinema,
  camera,
  cantos,
  focar,
  focoPuxado,
  pj,
  criaQuando,
  rampa,
  janela,
  duracao,
  Entra,
  Rastro,
  Pontos,
  Seta3D,
  Placa,
  Chip,
  Linha,
  Carimbo,
  Numero,
  Medidor,
  Etiqueta,
  Cota,
  Y_TOPO,
  Y_BAIXO,
  TEMA as tema,
  CORES,
  Easing,
  type Cena,
  type V3,
} from '../../base/kit';
import {
  AGRA,
  AGUA_Y,
  ALU_Y,
  BOLINHA_Y,
  CAMINHO_MANGUEIRA,
  CARVAO_Y,
  CARVOES,
  COCO_R,
  Coco,
  FUROS_ALU,
  MAPA,
  MESA,
  Mapa,
  Mesa,
  Narguile as NarguilePeca,
  PITEIRA_B,
  PONTA_FUNDA,
  PONTA_Y,
  Palacio,
  Pino,
  SALA,
  Sala,
  TABACO_TOPO,
  TOPO,
  TetoSala,
  VALVULA,
  VasoFundo,
  type EstadoNarguile,
  type Montagem,
} from './pecas';
import {PALAVRAS} from './palavras';

export const AUDIO_SEG = 70.33;
export const FPS = 30;
export const QUADROS = duracao(AUDIO_SEG);
const P = '002. narguile';

// ---------- 1. Tempos pela fala ----------
const quando = criaQuando(PALAVRAS);
const T = {
  naoPega: quando('não pega fogo'),
  queima: quando('Quem queima'),
  soCarvao: quando('só o carvão'),
  entao: quando('Então de onde'),
  fumaca: quando('tanta fumaça'),
  laEmCima: quando('Lá em cima'),
  tabaco: quando('com tabaco úmido'),
  melaco: quando('melaço'),
  glicerina: quando('melaço e glicerina') + 0.5,
  porCima: quando('Por cima'),
  aluminio: quando('papel-alumínio'),
  carvao: quando('carvão em brasa'),
  semEncostar: quando('sem encostar'),
  puxa: quando('Quando você puxa'),
  mangueira: quando('pela mangueira'),
  pressao: quando('a pressão dentro'),
  cai: quando('vaso cai'),
  oAr: quando('O ar passa'),
  quente: quando('fica quente'),
  atravessa: quando('atravessa os furos'),
  esquenta: quando('esquenta o tabaco'),
  vira: quando('A glicerina vira'),
  nuvem: quando('nuvem branca'),
  grossa: quando('tão grossa'),
  desce: quando('Esse vapor desce'),
  tubo: quando('tubo central'),
  mergulhado: quando('mergulhado'),
  cm3: quando('3 centímetros'),
  maisFundo: quando('Mais fundo'),
  pesado: quando('pesado de puxar'),
  laEmbaixo: quando('Lá embaixo'),
  borbulha: quando('borbulha'),
  esfria: quando('esfria'),
  sobe: quando('e sobe para'),
  espaco: quando('espaço vazio'),
  bolha: quando('barulho de bolha'),
  tudo: quando('Tudo depende'),
  vedacao: quando('vedação'),
  seEntra: quando('Se entra ar'),
  borracha: quando('borracha frouxa'),
  naoCai: quando('pressão não cai'),
  naoSai: quando('não sai nada'),
  bolinha: quando('E aquela bolinha'),
  valvula: quando('válvula de alívio'),
  sopra: quando('Você sopra'),
  abre: quando('ela abre'),
  velha: quando('fumaça velha'),
  nome: quando('O nome vem'),
  nargil: quando('nargil'),
  coco: quando('quer dizer coco'),
  primeiros: quando('Os primeiros vasos'),
  cascas: quando('cascas de coco'),
  versao: quando('A versão mais'),
  india: quando('na Índia'),
  seculo: quando('século 16'),
  akbar: quando('imperador Akbar'),
  brasil: quando('E no Brasil'),
  d2014: quando('2014'),
  proibido: quando('ele é proibido'),
  fechado: quando('lugar fechado'),
  salva: quando('Salva aí'),
  jurava: quando('jurava'),
};

// ---------- 2. O mundo ----------
const N0: V3 = [0, TOPO + 0.002, 0]; // base do narguilé (2 mm acima do tampo: sem faces coincidentes)
const w = (p: V3): V3 => [N0[0] + p[0], N0[1] + p[1], N0[2] + p[2]];
const COCO: V3 = [0.36, TOPO, -0.13];
const VASO_FUNDO: V3 = [-0.31, TOPO + 0.002, 0];
const PLACA = {pos: [0.95, 0.24, 0.45] as V3, larg: 0.62, alt: 0.44};
// caixas de enquadramento (o que cada câmera precisa mostrar inteiro)
const TODO = {pos: w([0.05, 0.36, 0.06]), args: [0.4, 0.74, 0.42] as V3};
const FORN = {pos: w([0, 0.63, 0]), args: [0.11, 0.1, 0.11] as V3};
const BRASA = {pos: w([0, 0.668, 0]), args: [0.08, 0.04, 0.08] as V3};
const VASO = {pos: w([0, 0.13, 0]), args: [0.27, 0.27, 0.27] as V3};
const BORRACHA = {pos: w([0, 0.268, 0]), args: [0.08, 0.04, 0.08] as V3};
const VALV = {pos: w([-0.036, 0.312, 0]), args: [0.06, 0.05, 0.04] as V3};
const MANG = {pos: w([0.1, 0.17, 0.12]), args: [0.3, 0.34, 0.32] as V3};

// caminhos do ar (coordenadas do narguilé)
const AR_ENTRA: V3[] = [w([0, 0.75, 0]), w([0, 0.7, 0]), w([0, CARVAO_Y, 0])];
const AR_QUENTE: V3[] = [w([0, CARVAO_Y, 0]), w([0, ALU_Y, 0]), w([0, TABACO_TOPO - 0.01, 0]), w([0, 0.613, 0]), w([0, 0.58, 0])];
const DESCE: V3[] = [w([0, 0.6, 0]), w([0, 0.3, 0]), w([0, PONTA_Y + 0.004, 0])];
const PARA_MANGUEIRA: V3[] = [w([0.0, 0.14, -0.01]), w([0.02, 0.2, -0.01]), w([0.016, 0.255, 0]), w([0.013, 0.3, 0]), w([0.04, 0.32, 0]), ...CAMINHO_MANGUEIRA.slice(1).map(w), w(PITEIRA_B)];

// o estado do narguilé em cada instante (o mesmo em todas as cenas: continuidade entre os cortes)
const estado = (t: number, extra: EstadoNarguile = {}): EstadoNarguile => ({
  brasa: 0.72 + 0.28 * Math.sin(t * 2 * Math.PI * 0.3),
  nevoa: 0.22 + 0.4 * rampa(t, T.fumaca, T.fumaca + 1.5) + 0.38 * rampa(t, T.sobe, T.espaco + 0.8),
  calor: 0.7 * rampa(t, T.esquenta - 0.2, T.esquenta + 0.6),
  folga: janela(t, T.seEntra - 0.3, T.bolinha + 0.2, 0.5, 0.4),
  bolinha: janela(t, T.abre - 0.15, T.nome - 0.1, 0.25, 0.3),
  ...extra,
});

const Mundo: React.FC<{t: number; corte?: boolean; montagem?: Montagem; extra?: EstadoNarguile}> = ({t, corte = false, montagem, extra}) => (
  <>
    <Mesa />
    <NarguilePeca pos={N0} estado={estado(t, {corte, ...extra})} montagem={montagem} />
    <Coco pos={COCO} abre={rampa(t, T.nargil, T.nargil + 0.7, Easing.out(Easing.cubic))} />
    <Entra t={t} em={T.maisFundo - 0.15} modo="desliza" de="esquerda" distancia={0.8} sai={T.laEmbaixo} modoSai="desliza" para="esquerda">
      <VasoFundo pos={VASO_FUNDO} corte={corte} />
    </Entra>
    <Mapa />
    <Entra t={t} em={T.india - 0.1} modo="cai" altura={0.5}>
      <Pino pos={AGRA} />
    </Entra>
    <Entra t={t} em={T.akbar - 0.3} modo="cresce">
      <Palacio pos={[AGRA[0] + 0.1, AGRA[1], AGRA[2] + 0.07]} />
    </Entra>
    <Entra t={t} em={T.brasil} modo="cresce" dur={0.8}>
      <Placa tema={tema} pos={PLACA.pos} rot={[0, -0.35, 0]} larg={PLACA.larg} alt={PLACA.alt} fundo={CORES.escuro} linhas={[{t: 'BRASIL', tam: 120, cor: tema.texto}, {t: '2014', tam: 260, cor: tema.acento}]} />
    </Entra>
    <Sala />
    <Entra t={t} em={T.fechado - 0.2} modo="cai" altura={0.8}>
      <TetoSala />
    </Entra>
  </>
);

// bolhas subindo da ponta do tubo: quentes (acento) embaixo, frias (claras) em cima
const N_BOLHAS = 26;
const bolha = (t: number, i: number, de: number, ate: number): V3 | null => {
  const f = (t * 0.85 + i / N_BOLHAS) % 1;
  if (f < de || f >= ate) return null;
  const y = PONTA_Y + 0.002 + f * (AGUA_Y - PONTA_Y - 0.004);
  return w([Math.sin(i * 2.1 + f * 5) * 0.009 * (0.4 + f), y, -0.004 - ((i * 0.37) % 1) * 0.008]);
};
const Bolhas: React.FC<{t: number; k: number}> = ({t, k}) =>
  k <= 0 ? null : (
    <>
      <Pontos n={N_BOLHAS} r={0.0032} pos={(i) => bolha(t, i, 0, 0.5)} escala={() => k} />
      <Pontos n={N_BOLHAS} r={0.0036} cor={CORES.claro} pos={(i) => bolha(t, i, 0.5, 1)} escala={() => k} />
    </>
  );

// ---------- 3. As cenas ----------

// 1 · macro: a brasa pulsando sobre o alumínio
const C1Gancho: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(BRASA.pos, BRASA.args), de: [24, 34], empurra: 0.24, grua: -0.05});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, w([0, CARVAO_Y, 0]), 0.25, 3)} sombraArea={2}>
        <Mundo t={t} />
      </CanvasCinema>
      <Carimbo texto="NÃO PEGA FOGO" k={rampa(t, T.naoPega, T.naoPega + 0.3, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 2 · corte: o fornilho serrado ao meio — só o carvão em laranja
const C2SoCarvao: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(FORN.pos, FORN.args), de: [0, 12], empurra: 0.16, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} corte />
      </CanvasCinema>
      <Etiqueta x={600} y={640} alvo={pj(w(CARVOES[1].p), cam)} titulo="Só o carvão queima" sub="O TABACO SÓ ESQUENTA" destaque aparece={rampa(t, T.soCarvao, T.soCarvao + 0.5, Easing.linear)} />
    </>
  );
};

// 3 · geral: o narguilé na mesa, a fumaça enchendo o vaso
const C3Fumaca: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos(TODO.pos, TODO.args), ...cantos(MESA.pos, [MESA.args[0], MESA.args[1], MESA.args[2]])], de: [32, 16], empurra: 0.14});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, TODO.pos, 1.0, 2)} sombraArea={2}>
        <Mundo t={t} />
      </CanvasCinema>
      <Linha>
        <Chip texto="DE ONDE VEM?" k={rampa(t, T.fumaca, T.fumaca + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 4 · close: o fornilho vazio recebe o tabaco
const C4Fornilho: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(FORN.pos, FORN.args), de: [-28, 38], empurra: 0.2, sentido: -1});
  const montagem: Montagem = {
    tabaco: (n) => (
      <Entra t={t} em={T.tabaco} modo="cai" altura={0.12}>
        {n}
      </Entra>
    ),
    aluminio: (n) => (
      <Entra t={t} em={T.aluminio} modo="cai" altura={0.1}>
        {n}
      </Entra>
    ),
    carvao: (n, i) => (
      <Entra t={t} em={T.carvao + i * 0.12} modo="cai" altura={0.12}>
        {n}
      </Entra>
    ),
  };
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} montagem={montagem} />
      </CanvasCinema>
      <Linha>
        <Chip texto="MELAÇO" k={rampa(t, T.melaco, T.melaco + 0.3)} />
        <Chip texto="GLICERINA" k={rampa(t, T.glicerina, T.glicerina + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 5 · detalhe (em corte): alumínio e carvão por cima, sem encostar no tabaco
const C5Aluminio: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, 0.655, 0]), [0.1, 0.05, 0.1]), de: [6, 16], empurra: 0.2});
  const montagem: Montagem = {
    aluminio: (n) => (
      <Entra t={t} em={T.aluminio - 0.1} modo="cai" altura={0.1}>
        {n}
      </Entra>
    ),
    carvao: (n, i) => (
      <Entra t={t} em={T.carvao - 0.1 + i * 0.12} modo="cai" altura={0.12}>
        {n}
      </Entra>
    ),
  };
  const foco = focoPuxado(cam, w([0, ALU_Y, 0]), w([0, CARVAO_Y, 0]), rampa(t, T.carvao - 0.3, T.carvao + 0.3), 0.2, 3);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={foco} sombraArea={2}>
        <Mundo t={t} corte montagem={montagem} />
      </CanvasCinema>
      <Cota a={pj(w([0.042, ALU_Y + 0.001, 0]), cam)} b={pj(w([0.042, TABACO_TOPO, 0]), cam)} texto="SEM ENCOSTAR" k={rampa(t, T.semEncostar - 0.1, T.semEncostar + 0.4)} desloca={70} />
    </>
  );
};

// 6 · médio: puxa pela mangueira — a pressão do vaso cai
const C6Puxa: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos(MANG.pos, MANG.args), ...cantos(TODO.pos, TODO.args)], de: [58, 18], empurra: 0.16});
  const p = PITEIRA_B;
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} />
        <Rastro caminho={PARA_MANGUEIRA.slice(4)} k={rampa(t, T.mangueira - 0.3, T.cai + 0.4)} cauda={0.5} n={60} r={0.004} />
        <Seta3D de={w([p[0] - 0.012, p[1] + 0.012, p[2]])} para={w([p[0] - 0.09, p[1] + 0.04, p[2] + 0.02])} k={rampa(t, T.puxa + 0.2, T.mangueira + 0.3)} grossura={0.005} />
      </CanvasCinema>
      <Medidor rotulo="PRESSÃO NO VASO" valor={1 - 0.45 * rampa(t, T.pressao, T.cai + 0.3)} texto={t > T.pressao + 0.3 ? 'CAINDO' : 'NORMAL'} k={rampa(t, T.puxa + 0.1, T.puxa + 0.4)} />
    </>
  );
};

// 7 · corte: o ar entra pelo carvão e sai quente
const C7ArQuente: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, 0.665, 0]), [0.12, 0.17, 0.1]), de: [8, 8], empurra: 0.18, sentido: 1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} corte />
        <Rastro caminho={AR_ENTRA} k={rampa(t, T.oAr, T.oAr + 0.9)} cauda={0.7} n={30} r={0.0035} cor={CORES.claro} />
        <Rastro caminho={AR_QUENTE} k={rampa(t, T.quente - 0.3, T.atravessa + 0.4)} cauda={0.6} n={40} r={0.004} />
      </CanvasCinema>
      <Etiqueta x={620} y={620} alvo={pj(w([0, CARVAO_Y - 0.004, 0.004]), cam)} titulo="Ar quente" sub="PASSOU PELA BRASA" destaque aparece={rampa(t, T.quente, T.quente + 0.5, Easing.linear)} />
    </>
  );
};

// 8 · macro: os furos do alumínio — o ar atravessa e aquece o tabaco
const C8Furos: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, ALU_Y, 0]), [0.075, 0.02, 0.075]), de: [-34, 58], empurra: 0.22, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, w([0, ALU_Y, 0]), 0.15, 3)} sombraArea={2}>
        <Mundo t={t} />
        <Pontos
          n={FUROS_ALU.length}
          r={0.0026}
          pos={(i) => {
            const f = (t * 0.9 + i * 0.137) % 1;
            const q = FUROS_ALU[i];
            return w([q[0], q[1] + 0.008 - f * 0.012, q[2]]);
          }}
          escala={(i) => rampa(t, T.atravessa - 0.2 + i * 0.02, T.atravessa + 0.3 + i * 0.02) * Math.sin(Math.PI * ((t * 0.9 + i * 0.137) % 1))}
        />
      </CanvasCinema>
      <Linha>
        <Chip texto="AQUECE, NÃO QUEIMA" k={rampa(t, T.esquenta, T.esquenta + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 9 · esquema: a glicerina vira vapor e a nuvem engrossa
const GOTAS: V3[] = [
  [-0.026, 0.646, 0.0012], [-0.012, 0.64, 0.0012], [0.004, 0.646, 0.0012], [0.02, 0.639, 0.0012], [0.031, 0.646, 0.0012], [-0.004, 0.628, 0.0012], [0.012, 0.626, 0.0012],
];
const C9Vapor: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, 0.56, 0]), [0.12, 0.22, 0.08]), de: [0, 4], empurra: 0.06});
  const kv = rampa(t, T.vira + 0.2, T.vira + 1.0);
  const grosso = rampa(t, T.nuvem - 0.2, T.grossa + 0.3);
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} corte />
        <Pontos n={GOTAS.length} r={0.0034} cor={CORES.claro} pos={(i) => w(GOTAS[i])} escala={() => 1 - 0.65 * kv} />
        <Pontos
          n={48}
          r={0.0022}
          cor={CORES.claro}
          pos={(i) => {
            const f = (t * 0.45 + i / 48) % 1;
            const y = 0.645 - f * 0.2;
            const larg = y > 0.613 ? 0.03 : 0.0045;
            return w([Math.sin(i * 1.7 + t * 0.8) * larg * 0.8, y, -0.003]);
          }}
          escala={(i) => kv * (0.7 + 1.1 * grosso) * Math.sin(Math.PI * ((t * 0.45 + i / 48) % 1))}
        />
      </CanvasCinema>
      <Linha>
        <Chip texto="GLICERINA" k={rampa(t, T.vira, T.vira + 0.3)} />
        <Chip texto="→ VAPOR" k={rampa(t, T.vira + 0.6, T.vira + 0.9)} destaque />
      </Linha>
      <Carimbo texto="NUVEM GROSSA" y={Y_BAIXO} tam={52} k={rampa(t, T.grossa - 0.1, T.grossa + 0.2, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 10 · corte: o vapor desce pelo tubo central
const C10Desce: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, 0.36, 0]), [0.28, 0.72, 0.2]), de: [0, 10], empurra: 0.12, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} corte />
        <Rastro caminho={DESCE} k={rampa(t, T.desce, T.mergulhado + 0.2)} cauda={0.45} n={60} r={0.005} />
      </CanvasCinema>
      <Etiqueta x={620} y={760} alvo={pj(w([0.009, 0.2, 0]), cam)} titulo="Tubo central" sub="LEVA O VAPOR ATÉ A ÁGUA" destaque aparece={rampa(t, T.tubo, T.tubo + 0.5, Easing.linear)} />
    </>
  );
};

// 11 · detalhe: a ponta do tubo, só uns 3 cm dentro da água
const C11Ponta: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, 0.11, 0]), [0.2, 0.12, 0.06]), de: [12, 6], empurra: 0.18});
  const foco = focoPuxado(cam, w([0, 0.16, 0]), w([0, PONTA_Y, 0]), rampa(t, T.mergulhado - 0.2, T.mergulhado + 0.4), 0.2, 3);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={foco} sombraArea={2}>
        <Mundo t={t} corte />
        <Bolhas t={t} k={0.6} />
      </CanvasCinema>
      <Cota a={pj(w([0.012, AGUA_Y, 0]), cam)} b={pj(w([0.012, PONTA_Y, 0]), cam)} texto="≈ 3 CM" k={rampa(t, T.cm3 - 0.2, T.cm3 + 0.4)} desloca={90} />
    </>
  );
};

// 12 · esquema: 3 cm × fundo demais
const C12Fundo: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([-0.155, TOPO + 0.14, 0], [0.62, 0.3, 0.27]), de: [0, 6], empurra: 0.06});
  const kk = rampa(t, T.maisFundo + 0.2, T.maisFundo + 0.7);
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} corte />
      </CanvasCinema>
      <Cota a={pj(w([0.012, AGUA_Y, 0]), cam)} b={pj(w([0.012, PONTA_Y, 0]), cam)} texto="3 CM" k={kk} desloca={60} />
      <Cota a={pj([VASO_FUNDO[0] - 0.012, VASO_FUNDO[1] + PONTA_FUNDA, 0], cam)} b={pj([VASO_FUNDO[0] - 0.012, VASO_FUNDO[1] + AGUA_Y, 0], cam)} texto="FUNDO" k={kk} desloca={60} />
      <Linha>
        <Chip texto="PESADO DE PUXAR" k={rampa(t, T.pesado, T.pesado + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 13 · macro: as bolhas sobem e esfriam
const C13Bolhas: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([0, 0.106, -0.004]), [0.12, 0.08, 0.04]), de: [-16, 10], empurra: 0.2, sentido: 1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, w([0, 0.105, -0.005]), 0.12, 3)} sombraArea={2}>
        <Mundo t={t} corte />
        <Bolhas t={t} k={1} />
      </CanvasCinema>
      <Linha>
        <Chip texto="ESFRIA" k={rampa(t, T.esfria, T.esfria + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 14 · close: o vapor enche o espaço vazio do vaso (e faz o barulho de bolha)
const C14Espaco: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(VASO.pos, VASO.args), de: [30, 14], empurra: 0.16, sentido: -1});
  const som = rampa(t, T.bolha, T.bolha + 1.2, Easing.linear);
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} />
        <Bolhas t={t} k={0.8} />
        <Rastro caminho={[w([0.135, 0.15, 0.02]), w([0.34, 0.17, 0.06])]} k={som} cauda={0.5} n={50} r={0.004} t={t} onda={{amp: 0.012, ondas: 5, vel: 6}} forca={1 - rampa(t, T.bolha + 1.0, T.bolha + 1.4)} />
      </CanvasCinema>
      <Etiqueta x={600} y={640} alvo={pj(w([0.05, 0.19, 0.04]), cam)} titulo="Espaço vazio" sub="ENCHE DE VAPOR" destaque aparece={rampa(t, T.espaco, T.espaco + 0.5, Easing.linear)} />
      <Linha y={Y_BAIXO}>
        <Chip texto="BLUB BLUB" k={rampa(t, T.bolha, T.bolha + 0.3)} />
      </Linha>
    </>
  );
};

// 15 · detalhe: a borracha afrouxa e o ar entra
const C15Vedacao: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(BORRACHA.pos, BORRACHA.args), de: [-30, 28], empurra: 0.2});
  const vaza = rampa(t, T.borracha - 0.1, T.borracha + 0.4);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, BORRACHA.pos, 0.15, 3)} sombraArea={2}>
        <Mundo t={t} />
        <Pontos
          n={16}
          r={0.0024}
          cor={CORES.claro}
          pos={(i) => {
            const f = (t * 0.8 + i / 16) % 1;
            const a = (i / 16) * Math.PI * 2;
            const r = 0.06 - f * 0.035;
            return w([Math.cos(a) * r, 0.272 - f * 0.004, Math.sin(a) * r]);
          }}
          escala={(i) => vaza * Math.sin(Math.PI * ((t * 0.8 + i / 16) % 1))}
        />
      </CanvasCinema>
      <Etiqueta x={600} y={620} alvo={pj(w([-0.012, 0.272, 0.02]), cam)} titulo="Borracha" sub="A VEDAÇÃO" destaque aparece={rampa(t, T.vedacao, T.vedacao + 0.5, Easing.linear)} />
    </>
  );
};

// 16 · número: com ar entrando, a pressão não cai
const C16NaoPuxa: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(TODO.pos, TODO.args), de: [-48, 10], empurra: 0.12, sentido: -1, mao: 0.4});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} />
      </CanvasCinema>
      <Medidor rotulo="PRESSÃO NO VASO" valor={1 - 0.14 * janela(t, T.naoCai, T.naoSai + 0.2, 0.3, 0.5)} texto="NÃO CAI" k={rampa(t, T.naoCai - 0.2, T.naoCai + 0.1)} />
      <Carimbo texto="NÃO PUXA" y={Y_BAIXO} k={rampa(t, T.naoSai, T.naoSai + 0.3, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 17 · close: a bolinha de metal do lado
const C17Valvula: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(VALV.pos, VALV.args), de: [-72, 16], empurra: 0.2});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, w([VALVULA[0], BOLINHA_Y, 0]), 0.15, 3)} sombraArea={2}>
        <Mundo t={t} />
      </CanvasCinema>
      <Etiqueta x={560} y={640} alvo={pj(w([VALVULA[0], BOLINHA_Y + 0.006, 0]), cam)} titulo="Válvula de alívio" sub="BOLINHA DE METAL" destaque aparece={rampa(t, T.valvula, T.valvula + 0.5, Easing.linear)} />
    </>
  );
};

// 18 · corte: sopra, a bolinha sobe e a fumaça velha sai
const C18Sopra: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(w([-0.035, 0.32, 0]), [0.09, 0.1, 0.05]), de: [-8, 10], empurra: 0.16, sentido: -1});
  const sai = rampa(t, T.abre, T.abre + 0.4);
  const foco = focoPuxado(cam, w([VALVULA[0], BOLINHA_Y, 0]), w([VALVULA[0], BOLINHA_Y + 0.04, 0]), rampa(t, T.velha - 0.3, T.velha + 0.3), 0.15, 3);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={foco} sombraArea={2}>
        <Mundo t={t} corte />
        <Rastro caminho={[w([0, 0.2, -0.01]), w([0, 0.29, -0.004]), w([-0.03, 0.3, -0.004]), w([VALVULA[0], 0.305, -0.004])]} k={rampa(t, T.sopra, T.abre + 0.2)} cauda={0.5} n={36} r={0.0035} cor={CORES.claro} />
        <Pontos
          n={20}
          r={0.003}
          cor={CORES.claro}
          pos={(i) => {
            const f = (t * 0.7 + i / 20) % 1;
            return w([VALVULA[0] + Math.sin(i * 2.3 + f * 4) * 0.008 * f, BOLINHA_Y + 0.02 + f * 0.06, -0.002]);
          }}
          escala={(i) => sai * Math.sin(Math.PI * ((t * 0.7 + i / 20) % 1)) * (1.2 + (i % 3) * 0.3)}
        />
        <Seta3D de={w([VALVULA[0] + 0.02, BOLINHA_Y + 0.02, 0.01])} para={w([VALVULA[0] + 0.02, BOLINHA_Y + 0.07, 0.01])} k={rampa(t, T.velha - 0.1, T.velha + 0.3)} grossura={0.003} />
      </CanvasCinema>
      <Linha>
        <Chip texto="SÓ SAI, NÃO ENTRA" k={rampa(t, T.velha, T.velha + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 19 · médio: o coco se abre — nargil quer dizer coco
const C19Coco: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([COCO[0], COCO[1] + COCO_R, COCO[2]], [0.28, 0.12, 0.14]), de: [24, 22], empurra: 0.18});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} />
      </CanvasCinema>
      <Etiqueta x={560} y={620} alvo={pj([COCO[0] + 0.05, COCO[1] + 0.03, COCO[2]], cam)} titulo="Nargil = coco" sub="EM PERSA" destaque aparece={rampa(t, T.coco - 0.1, T.coco + 0.4, Easing.linear)} />
    </>
  );
};

// 20 · geral: a casca de coco era o vaso
const C20Casca: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos(TODO.pos, TODO.args), ...cantos([COCO[0], COCO[1] + COCO_R, COCO[2]], [0.3, 0.12, 0.14])], de: [-18, 16], empurra: 0.12, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={2}>
        <Mundo t={t} />
        <Seta3D de={[COCO[0] - 0.05, COCO[1] + 0.09, COCO[2] + 0.03]} para={w([0.15, 0.14, 0.02])} k={rampa(t, T.cascas - 0.2, T.cascas + 0.4)} grossura={0.006} />
      </CanvasCinema>
      <Linha>
        <Chip texto="O 1º VASO" k={rampa(t, T.primeiros, T.primeiros + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 21 · de cima: o mapa — Índia, século 16, corte de Akbar
const C21Mapa: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([MAPA.pos[0], 0.05, MAPA.pos[2]], [MAPA.larg * 0.85, 0.1, MAPA.prof * 0.85]), de: [0, 70], empurra: 0.14, arco: 0.12});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, AGRA, 0.8, 2)} sombraArea={2}>
        <Mundo t={t} />
      </CanvasCinema>
      <Linha>
        <Chip texto="ÍNDIA" k={rampa(t, T.india, T.india + 0.3)} />
        <Chip texto="SÉC. 16" k={rampa(t, T.seculo, T.seculo + 0.3)} destaque />
      </Linha>
    </>
  );
};

// 22 · número: no Brasil, desde 2014
const C22Ano: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([PLACA.pos[0], PLACA.alt / 2 + 0.02, PLACA.pos[2]], [PLACA.larg, PLACA.alt + 0.04, 0.3]), de: [-30, 8], empurra: 0.14, mao: 0.3});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={3}>
        <Mundo t={t} />
      </CanvasCinema>
      <Numero valor={String(Math.round(2000 + 14 * rampa(t, T.d2014 - 0.5, T.d2014 + 0.3)))} rotulo="NO BRASIL, DESDE" k={rampa(t, T.brasil, T.brasil + 0.3)} />
    </>
  );
};

// 23 · médio: a sala fecha (teto desce) e o narguilé fica do lado de fora
const C23Sala: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos([SALA.pos[0], SALA.args[1] / 2 + 0.05, SALA.pos[2]], [SALA.args[0], SALA.args[1] + 0.1, SALA.args[2]]), ...cantos(TODO.pos, TODO.args)], de: [22, 20], empurra: 0.14, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={4}>
        <Mundo t={t} />
      </CanvasCinema>
      <Carimbo texto="PROIBIDO EM LOCAL FECHADO" tam={42} k={rampa(t, T.fechado + 0.1, T.fechado + 0.4, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 24 · geral (grua subindo): o narguilé na mesa, a brasa pulsando
const C24Fecho: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos(MESA.pos, MESA.args), ...cantos(TODO.pos, TODO.args)], de: [34, 20], empurra: -0.12, grua: 0.3});
  return (
    <>
      <CanvasCinema cam={cam} t={t} sombraArea={4}>
        <Mundo t={t} />
      </CanvasCinema>
      <Carimbo texto="SÓ O CARVÃO QUEIMA" tam={54} k={rampa(t, T.jurava, T.jurava + 0.3, Easing.out(Easing.back(2)))} />
      <Linha y={Y_BAIXO}>
        <Chip texto="SALVA E MANDA" k={janela(t, T.salva, 99)} tam={26} />
      </Linha>
    </>
  );
};

// ---------- 4. A lista de cenas ----------
const CENAS: Cena[] = [
  {em: 0, plano: 'macro', nome: 'a brasa', render: C1Gancho},
  {em: T.queima - 0.1, plano: 'corte', nome: 'só o carvão queima', render: C2SoCarvao},
  {em: T.entao - 0.1, plano: 'geral', nome: 'de onde vem a fumaça', render: C3Fumaca},
  {em: T.laEmCima - 0.1, plano: 'close', nome: 'o fornilho e o tabaco', render: C4Fornilho},
  {em: T.porCima - 0.1, plano: 'detalhe', nome: 'alumínio e carvão', render: C5Aluminio},
  {em: T.puxa - 0.1, plano: 'medio', nome: 'puxa: a pressão cai', render: C6Puxa},
  {em: T.oAr - 0.1, plano: 'corte', nome: 'o ar fica quente', render: C7ArQuente},
  {em: T.atravessa - 0.1, plano: 'macro', nome: 'os furos do alumínio', render: C8Furos},
  {em: T.vira - 0.1, plano: 'esquema', nome: 'glicerina vira vapor', render: C9Vapor},
  {em: T.desce - 0.05, plano: 'corte', nome: 'desce pelo tubo', render: C10Desce},
  {em: T.mergulhado - 0.1, plano: 'detalhe', nome: '3 cm na água', render: C11Ponta},
  {em: T.maisFundo - 0.1, plano: 'esquema', nome: 'fundo demais', render: C12Fundo},
  {em: T.laEmbaixo - 0.1, plano: 'macro', nome: 'borbulha e esfria', render: C13Bolhas},
  {em: T.sobe - 0.1, plano: 'close', nome: 'o espaço vazio', render: C14Espaco},
  {em: T.tudo - 0.1, plano: 'detalhe', nome: 'a vedação', render: C15Vedacao},
  {em: T.naoCai - 0.2, plano: 'numero', nome: 'não puxa', render: C16NaoPuxa},
  {em: T.bolinha - 0.1, plano: 'close', nome: 'a válvula', render: C17Valvula},
  {em: T.sopra - 0.1, plano: 'corte', nome: 'sopra: a fumaça sai', render: C18Sopra},
  {em: T.nome - 0.1, plano: 'medio', nome: 'nargil = coco', render: C19Coco},
  {em: T.primeiros - 0.1, plano: 'geral', nome: 'o 1º vaso', render: C20Casca},
  {em: T.versao - 0.1, plano: 'cima', nome: 'Índia, século 16', render: C21Mapa},
  {em: T.brasil - 0.1, plano: 'numero', nome: 'desde 2014', render: C22Ano},
  {em: T.proibido - 0.1, plano: 'medio', nome: 'local fechado', render: C23Sala},
  {em: T.salva - 0.1, plano: 'geral', nome: 'fecho', render: C24Fecho},
];

// ---------- 5. Pílula de estado ----------
const ESTADOS: [number, string][] = [
  [0, 'O CARVÃO'],
  [T.laEmCima, 'O FORNILHO'],
  [T.puxa, 'A PUXADA'],
  [T.vira, 'O VAPOR'],
  [T.desce, 'A ÁGUA'],
  [T.tudo, 'A VEDAÇÃO'],
  [T.bolinha, 'A VÁLVULA'],
  [T.nome, 'O NOME'],
  [T.versao, 'A ORIGEM'],
  [T.brasil, 'A REGRA'],
];

// ---------- 6. Sons ----------
const SONS = [
  {t: T.naoPega, f: 'impacto', v: 0.32},
  {t: T.tabaco + 0.15, f: 'baque', v: 0.22},
  {t: T.melaco, f: 'pop', v: 0.26},
  {t: T.glicerina, f: 'pop', v: 0.26},
  {t: T.carvao + 0.1, f: 'baque', v: 0.22},
  {t: T.pressao, f: 'tique', v: 0.24},
  {t: T.esquenta, f: 'pop', v: 0.26},
  {t: T.nuvem, f: 'subida', v: 0.26},
  {t: T.cm3, f: 'pop', v: 0.26},
  {t: T.pesado, f: 'pop', v: 0.26},
  {t: T.bolha, f: 'pop', v: 0.24},
  {t: T.naoSai, f: 'impacto', v: 0.3},
  {t: T.valvula, f: 'pop', v: 0.26},
  {t: T.coco, f: 'baque', v: 0.26},
  {t: T.india, f: 'pop', v: 0.26},
  {t: T.d2014, f: 'ding', v: 0.3},
  {t: T.fechado, f: 'baque', v: 0.28},
  {t: T.jurava, f: 'impacto', v: 0.3},
];

export const Narguile: React.FC<{guia?: boolean; semInterface?: boolean}> = ({guia, semInterface}) => (
  <VideoKit pasta={P} assunto="NARGUILÉ" palavras={PALAVRAS} audioSeg={AUDIO_SEG} cenas={CENAS} estados={ESTADOS} sons={SONS} guia={guia} semInterface={semInterface} />
);
