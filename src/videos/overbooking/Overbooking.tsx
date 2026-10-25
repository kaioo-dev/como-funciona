// 001. Overbooking — o EXEMPLO DE REFERÊNCIA do kit (v1.2). Copie a estrutura daqui.
// A companhia vende mais passagens do que assentos, de propósito.
//
// Como ele é montado (é assim que todo vídeo do kit deve ser):
// 1. T = os tempos pela fala (quando('trecho')), nunca segundos chutados.
// 2. Um mundo só (pátio, avião, portão, balcão) visto de câmeras diferentes.
// 3. 20 cenas curtas (~3,2 s cada) e cada corte muda o TIPO de plano (de cima, close, médio, gráfico, contra-plongée…).
//    Cada cena explica UM detalhe com um elemento próprio (placar, gráfico, pilha de moedas, relógio, caminhos).
// 4. Câmera sempre por camera()/sobreOmbro(): diz O QUE enquadrar e DE ONDE olhar; o enquadramento se calcula sozinho.
// 5. Nada surge do nada: tudo entra por <Entra> (cai, cresce, desliza, aparece) na palavra certa.
// 6. O VideoKit cuida do resto: cortes, legenda, pílula, marca, narração, trilha e sons.
import React from 'react';
import {
  VideoKit,
  CanvasCinema,
  camera,
  sobreOmbro,
  cantos,
  pessoa,
  busto,
  focar,
  focoPuxado,
  pj,
  criaQuando,
  rampa,
  janela,
  conta,
  duracao,
  Entra,
  Fantasma,
  Rastro,
  Seta3D,
  Brilho,
  Boneco,
  Caixa,
  Moeda,
  Onda,
  Placa,
  Solido,
  Chip,
  Linha,
  Carimbo,
  Numero,
  Placar,
  Cartao,
  Etiqueta,
  Y_TOPO,
  Y_BAIXO,
  TEMA as tema,
  CORES,
  Easing,
  type Cena,
  type Pose,
  type V3,
} from '../../base/kit';
import {Aviao, Balcao, Bandeja, Cama, Carro, CartaoMilhas, Chave, Escada, FY, Multidao, N_ASSENTOS, PE_ESCADA, PISO, PORTA, Passagens, Patio, RAIO, Relogio, posAssento, type Cartao3D, type Pessoa} from './pecas';
import {PALAVRAS} from './palavras';

export const AUDIO_SEG = 64.12;
export const FPS = 30;
export const QUADROS = duracao(AUDIO_SEG);
const P = '001. overbooking';

// ---------- 1. Tempos pela fala ----------
const quando = criaQuando(PALAVRAS);
const T = {
  passagens: quando('vende mais passagens'),
  faz: quando('E faz isso'),
  proposito: quando('propósito'),
  sabe: quando('Sabe por quê'),
  porque: quando('Porque em quase'),
  naoAparece: quando('não aparece'),
  perde: quando('Perde a hora'),
  muda: quando('muda de plano'),
  desiste: quando('desiste'),
  olha: quando('A companhia olha'),
  historico: quando('histórico'),
  preve: quando('prevê'),
  exemplo: quando('Por exemplo'),
  l180: quando('180 lugares'),
  conta: quando('se a conta diz'),
  uns10: quando('uns 10'),
  v190: quando('vende 190'),
  quaseSempre: quando('Quase sempre'),
  lotado: quando('sai lotado'),
  masAs: quando('Mas às vezes'),
  todoMundo: quando('todo mundo aparece'),
  sobram: quando('sobram 10'),
  ai: quando('Aí a empresa'),
  voluntarios: quando('pedir voluntários'),
  quemAceita: quando('quem aceita'),
  dinheiro: quando('dinheiro'),
  milhas: quando('milhas'),
  hotel1: quando('ou hotel'),
  negocia: quando('se negocia'),
  ninguem: quando('Se ninguém'),
  fora: quando('ficar de fora'),
  vontade: quando('contra a sua vontade'),
  anac: quando('a ANAC'),
  naHora: quando('compensação na hora'),
  doisMil: quando('R$ 2 mil'),
  internacional: quando('No internacional'),
  dobro: quando('o dobro'),
  escolhe: quando('ainda escolhe'),
  outroVoo: quando('outro voo', 2),
  reembolso: quando('reembolso total'),
  outroJeito: quando('outro jeito'),
  esperou: quando('Esperou mais'),
  comida: quando('direito a comida'),
  dormir: quando('tiver que dormir'),
  hotel2: quando('hotel', 2),
  entao: quando('Então da próxima'),
  voluntario: quando('pedirem voluntário'),
  sabe2: quando('já sabe'),
  negociar: quando('pra negociar'),
  salva: quando('Salva aí'),
};

// ---------- 2. O mundo (um lugar só, várias câmeras) ----------
const BALCAO: V3 = [PE_ESCADA[0] - 3.4, 0, PE_ESCADA[2] + 0.6];
const TAMPO = 1.16; // altura do tampo do balcão
const corteCabine = PISO + 1.3;
const VAZIOS = new Set([16, 30, 53, 79, 95, 110, 129, 146, 160, 175]); // os 10 que não vêm
const sorteio = (semente: number) => {
  let k = semente;
  return () => {
    k = (k * 16807) % 2147483647;
    return (k % 10000) / 10000;
  };
};
// as 10 passagens a mais caem num montinho ao lado da porta
const MONTE: V3 = [8.6, 0, RAIO + 2.6];
const CARTOES = (() => {
  const r = sorteio(11);
  return Array.from({length: 190}, (_, i) => {
    const t0 = 0.5 + (i / 190) * 2.6 + r() * 0.2;
    let alvo: V3;
    if (i < N_ASSENTOS) {
      const [x, y, z] = posAssento(i);
      alvo = [x + 0.02, y + 0.45, z];
    } else {
      const j = i - N_ASSENTOS;
      alvo = [MONTE[0] + (r() - 0.5) * 1.6, 0.02 + j * 0.035, MONTE[2] + (r() - 0.5) * 1.0];
    }
    return {t0, alvo, giro: r() * 6, extra: i >= N_ASSENTOS};
  });
})();
// passagens caindo com gravidade (acelera e assenta), sem surgir do nada: começam acima do quadro
const passagensNoAr = (t: number) => {
  const cartoes: Cartao3D[] = [];
  let vendidas = 0;
  for (const c of CARTOES) {
    const q = t - c.t0;
    if (q <= 0) continue;
    vendidas++;
    const e = Math.min(1, (9.8 * q * q) / 2 / 12);
    cartoes.push({
      pos: [c.alvo[0], c.alvo[1] + (1 - e) * 12, c.alvo[2]],
      rot: [(1 - e) * c.giro, c.giro * (1 - e) * 0.5 + (c.extra ? c.giro : 0), (1 - e) * 1.2],
      cor: c.extra ? tema.acento : tema.objetoClaro,
      s: 1.35,
    });
  }
  return {cartoes, vendidas};
};
// a fila do portão: 5 na frente, 5 atrás
const GRUPO: V3[] = [
  ...[-1.4, -0.7, 0, 0.7, 1.4].map((dx, i) => [BALCAO[0] + dx, 0, BALCAO[2] + 2.3 + (i % 2) * 0.12] as V3),
  ...[-1.05, -0.35, 0.35, 1.05, 1.75].map((dx, i) => [BALCAO[0] + dx, 0, BALCAO[2] + 3.25 - (i % 2) * 0.1] as V3),
];
const VOCE = 2; // o boneco do meio da 1ª fila é "você"
const AGENTE: V3 = [BALCAO[0] - 0.3, 0, BALCAO[2] - 0.95];
const Fila: React.FC<{t: number; n?: number; mao?: number; fantasma?: number}> = ({t, n = 10, mao = 0, fantasma = 0}) => (
  <>
    {GRUPO.slice(0, n).map((p, i) => {
      const pose: Pose = i === VOCE && mao > 0 ? {maoD: {alvo: [p[0] + 0.25, 2.35, p[2] - 0.15], k: mao}} : {cabeca: [Math.sin(t * 1.3 + i) * 0.04, 0, 0]};
      const b = <Boneco key={i} tema={tema} id={`pessoa${i}`} pos={p} rotY={Math.PI + ((i % 3) - 1) * 0.15} pose={pose} />;
      return i === 1 ? (
        <Fantasma key={i} k={fantasma}>
          {b}
        </Fantasma>
      ) : (
        b
      );
    })}
  </>
);
// pilha de moedas que se forma moeda a moeda (cada uma cai e assenta em cima da anterior)
const Moedas: React.FC<{t: number; pos: V3; n: number; ini: number; ritmo?: number; r?: number}> = ({t, pos, n, ini, ritmo = 0.045, r = 0.2}) => (
  <>
    {Array.from({length: n}, (_, i) => (
      <Entra key={i} t={t} em={ini + i * ritmo} modo="cai" altura={0.9}>
        <Moeda tema={tema} pos={[pos[0], pos[1] + r * 0.13 + i * r * 0.27, pos[2]]} rot={[0, i * 0.7, 0]} r={r} />
      </Entra>
    ))}
  </>
);

// ---------- 3. As cenas ----------
// Cada cena recebe {t, ini, fim, k}: t = tempo do vídeo, k = progresso da cena (0 → 1, já suavizado).

// 1 · de cima: o avião vira um mapa de assentos e as passagens caem do céu
const C1Gancho: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([0, PISO, 0.6], [26, 0.6, 7.5]), de: [90, 74], empurra: 0.12, arco: 0.14});
  const {cartoes, vendidas} = passagensNoAr(t);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [0, PISO, 0], 18, 2)} sombraArea={24}>
        <Patio luzes={false} />
        <Aviao tema={tema} corteY={corteCabine} />
        <Passagens cartoes={cartoes} brilho={0.06} />
      </CanvasCinema>
      <Placar k={rampa(t, 0.3, 0.8)} kb={rampa(t, T.passagens, T.passagens + 0.4)} a={{valor: '180', rotulo: 'ASSENTOS'}} b={{valor: String(vendidas), rotulo: 'PASSAGENS', destaque: vendidas > 180}} />
    </>
  );
};

// 2 · close: as 10 passagens que sobraram, no chão
const C2Proposito: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([MONTE[0], 0.3, MONTE[2]], [2.2, 0.6, 1.6]), de: [25, 32], empurra: 0.2, sentido: -1});
  const {cartoes} = passagensNoAr(t);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [MONTE[0], 0.1, MONTE[2]], 1.6, 3)}>
        <Patio luzes={false} />
        <Aviao tema={tema} porta={0} />
        <Passagens cartoes={cartoes.filter((_, i) => i >= N_ASSENTOS)} brilho={0.1} />
        <Onda pos={MONTE} k={rampa(t, T.proposito, T.proposito + 1.1, Easing.out(Easing.quad))} cor={tema.acento} raio={2.4} />
      </CanvasCinema>
      <Linha>
        <Chip texto="10 A MAIS" k={rampa(t, T.faz - 0.1, T.faz + 0.25)} destaque />
      </Linha>
      <Carimbo texto="DE PROPÓSITO" k={rampa(t, T.proposito - 0.05, T.proposito + 0.3, Easing.out(Easing.back(2)))} />
      <Carimbo texto="SABE POR QUÊ?" y={Y_BAIXO} tam={52} k={rampa(t, T.sabe, T.sabe + 0.3, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 3 · médio: a fila do portão; um passageiro "comprou e não veio" (vira fantasma)
const C3NoShow: Cena['render'] = ({t, k}) => {
  const alvos = [...pessoa(GRUPO[0]), ...pessoa(GRUPO[4]), ...cantos([BALCAO[0], 0.6, BALCAO[2]], [2.6, 1.2, 0.7])];
  const cam = camera(k, t, {alvos, de: [28, 12], empurra: 0.14});
  const fant = rampa(t, T.naoAparece - 0.2, T.naoAparece + 0.6);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focoPuxado(cam, GRUPO[3], [GRUPO[1][0], 1.2, GRUPO[1][2]], rampa(t, T.naoAparece - 0.3, T.naoAparece + 0.3), 2.2, 3)}>
        <Patio luzes={false} />
        <Solido id="balcao">
          <Balcao tema={tema} pos={BALCAO} />
        </Solido>
        <Fila t={t} n={5} fantasma={fant} />
      </CanvasCinema>
      <Etiqueta x={560} y={Y_TOPO + 140} alvo={pj([GRUPO[1][0], 1.5, GRUPO[1][2]], cam)} titulo="Comprou e não veio" sub="NO-SHOW" destaque aparece={rampa(t, T.naoAparece + 0.1, T.naoAparece + 0.6, Easing.linear)} />
    </>
  );
};

// 4 · detalhe: dentro da cabine, a poltrona vazia; os motivos em chips
const C4Motivos: Cena['render'] = ({t, k}) => {
  const vazio = posAssento(110);
  const cam = camera(k, t, {alvos: cantos([vazio[0], PISO + 0.6, vazio[2]], [2.2, 1.0, 2.0]), de: [70, 40], empurra: 0.18, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [vazio[0], vazio[1] + 0.5, vazio[2]], 1.4, 3)}>
        <Aviao tema={tema} corteY={corteCabine} ocupado={(i) => (VAZIOS.has(i) ? 0 : 1)} corAssento={(i) => (VAZIOS.has(i) ? tema.acento : tema.objetoEscuro)} />
      </CanvasCinema>
      <Linha y={Y_TOPO}>
        <Chip texto="PERDEU A HORA" k={rampa(t, T.perde - 0.05, T.perde + 0.3)} tam={28} />
        <Chip texto="MUDOU DE PLANO" k={rampa(t, T.muda - 0.05, T.muda + 0.3)} tam={28} />
        <Chip texto="DESISTIU" k={rampa(t, T.desiste - 0.05, T.desiste + 0.3)} tam={28} destaque />
      </Linha>
    </>
  );
};

// 5 · gráfico: o histórico da rota (quem faltou nos últimos 10 voos) e a média
const HIST = [9, 11, 8, 12, 10, 7, 10, 13, 9, 11];
const Z_B = 12;
const xB = (i: number) => -2.7 + i * 0.6;
const ESC = 0.26;
const C5Historico: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([0, 1.7, Z_B], [6.4, 3.4, 0.5]), de: [12, 8], empurra: 0.1, arco: 0.2});
  const media = rampa(t, T.preve - 0.1, T.preve + 0.6);
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio luzes={false} />
        {HIST.map((n, i) => (
          <Entra key={i} t={t} em={T.historico - 0.3 + i * 0.1} modo="cresce" dur={0.5}>
            <Caixa args={[0.42, n * ESC, 0.42]} raio={0.06} cor={i === HIST.length - 1 ? CORES.claro : CORES.medio} position={[xB(i), (n * ESC) / 2, Z_B]} />
          </Entra>
        ))}
        <Seta3D de={[-3.1, 10 * ESC, Z_B + 0.3]} para={[3.1, 10 * ESC, Z_B + 0.3]} k={media} grossura={0.03} />
      </CanvasCinema>
      <Linha>
        <Chip texto="NÃO VIERAM · ÚLTIMOS 10 VOOS" k={rampa(t, T.historico - 0.1, T.historico + 0.3)} tam={26} />
      </Linha>
      <Numero valor="≈ 10" unidade="por voo" rotulo="A COMPANHIA PREVÊ QUE FALTAM" k={rampa(t, T.preve + 0.2, T.preve + 0.6)} y={Y_TOPO + 90} />
    </>
  );
};

// 6 · geral: o avião de 180 lugares, de fora
const C6Aviao180: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([0, FY, 0], [30, 6, 5]), de: [62, 6], empurra: 0.1, sentido: -1, arco: 0.2});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [6, FY, RAIO], 14, 2.5)} sombraArea={22}>
        <Patio />
        <Aviao tema={tema} janelas={1} />
      </CanvasCinema>
      <Numero valor={conta(0, 180, rampa(t, T.l180 - 0.2, T.l180 + 0.6))} unidade="lugares" rotulo="POR EXEMPLO" k={rampa(t, T.l180 - 0.25, T.l180 + 0.15)} />
    </>
  );
};

// 7 · esquema: a cabine vista de cima; os 10 que não vêm acendem e a conta fecha em 190
const C7Conta: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([0, PISO, 0], [25, 0.6, 4.2]), de: [90, 82], empurra: 0.08, arco: 0.06});
  const acende = rampa(t, T.uns10, T.uns10 + 0.4);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [0, PISO, 0], 16, 2)} sombraArea={22} frente={0}>
        <Patio luzes={false} />
        <Aviao tema={tema} corteY={corteCabine} ocupado={(i) => (VAZIOS.has(i) ? 0 : 1)} corAssento={(i) => (VAZIOS.has(i) && acende > 0.5 ? tema.acento : tema.objetoEscuro)} />
        {[...VAZIOS].map((i) => {
          const [x, y, z] = posAssento(i);
          return <Brilho key={i} pos={[x, y + 0.6, z]} k={acende * (0.8 + 0.2 * Math.sin(t * 2 + i))} r={0.14} />;
        })}
      </CanvasCinema>
      <Cartao
        titulo="A CONTA"
        k={rampa(t, T.conta - 0.3, T.conta + 0.1)}
        linhas={[
          {texto: '180 lugares', k: 1},
          {texto: '+ 10 que não vêm', k: rampa(t, T.uns10, T.uns10 + 0.3), destaque: true},
          {texto: '= 190 passagens', k: rampa(t, T.v190, T.v190 + 0.3)},
        ]}
      />
    </>
  );
};

// 8 · contra-plongée: quase sempre fecha e o avião decola lotado
const C8Lotado: Cena['render'] = ({t, ini, k}) => {
  const tau = t - ini;
  const x = -18 + tau * tau * 2.2; // acelerando na pista
  const sobe = Math.max(0, x - 8) * 0.22;
  const pitch = Math.min(0.17, Math.max(0, x - 6) * 0.025);
  // a câmera acompanha o avião (os alvos andam com ele)
  const cam = camera(k, t, {alvos: cantos([x + 1, FY + sobe, 0], [32, 6, 5]), de: [38, 3], empurra: 0.04, arco: 0.12, mao: 0.6});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [x, FY + sobe, 0], 12, 2.5)} sombraArea={30}>
        <Patio />
        <Aviao tema={tema} pos={[x, sobe, 0]} rot={[0, 0, pitch]} trem={sobe < 1.5 ? 1 : 0} />
      </CanvasCinema>
      <Linha>
        <Chip texto="LOTADO · 180 DE 180" k={rampa(t, T.lotado - 0.3, T.lotado + 0.1)} destaque />
      </Linha>
    </>
  );
};

// 9 · de cima: às vezes TODO mundo aparece (190 pessoas no portão)
const COLS = 19;
const posFila = (i: number): V3 => [PE_ESCADA[0] - 6.0 + (i % COLS) * 0.62 + (Math.floor(i / COLS) % 2) * 0.3, 0, PE_ESCADA[2] + 1.4 + Math.floor(i / COLS) * 0.66];
const SOBRAM = new Set([183, 184, 185, 186, 187, 188, 189, 172, 173, 174]);
const C9Todos: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([PE_ESCADA[0] - 0.5, 1, PE_ESCADA[2] + 3.4], [13, 2, 8]), de: [35, 52], empurra: 0.12});
  const pessoas: Pessoa[] = Array.from({length: 190}, (_, i) => ({
    pos: posFila(i),
    cor: SOBRAM.has(i) && t > T.sobram ? tema.acento : tema.pessoa,
    s: rampa(t, T.todoMundo - 0.6 + (i % COLS) * 0.02 + Math.floor(i / COLS) * 0.05, T.todoMundo - 0.1 + (i % COLS) * 0.02 + Math.floor(i / COLS) * 0.05),
  }));
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio luzes={false} />
        <Aviao tema={tema} porta={1} />
        <Escada tema={tema} />
        <Balcao tema={tema} pos={BALCAO} />
        <Multidao pessoas={pessoas} />
      </CanvasCinema>
      <Placar k={rampa(t, T.todoMundo, T.todoMundo + 0.4)} a={{valor: '190', rotulo: 'NO PORTÃO'}} b={{valor: '180', rotulo: 'ASSENTOS'}} />
    </>
  );
};

// 10 · médio: 180 sobem a escada, sobram 10 (em laranja)
const C10Sobram: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos([PE_ESCADA[0], 1.2, PE_ESCADA[2] + 3.2], [6, 2.4, 3]), [PORTA[0], PORTA[1] + 1, PORTA[2]]], de: [62, 14], empurra: 0.16, sentido: -1});
  const pessoas: Pessoa[] = Array.from({length: 190}, (_, i) => {
    const base = posFila(i);
    if (SOBRAM.has(i)) return {pos: base, cor: tema.acento, s: 1};
    const vai = rampa(t, T.sobram - 1.2 + (i % 47) * 0.02, T.sobram - 0.2 + (i % 47) * 0.02, Easing.in(Easing.quad));
    return {pos: [base[0] + (PE_ESCADA[0] - base[0]) * vai, 0, base[2] + (PE_ESCADA[2] - 0.4 - base[2]) * vai], cor: tema.pessoa, s: 1 - vai};
  });
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio luzes={false} />
        <Aviao tema={tema} porta={1} />
        <Escada tema={tema} />
        <Multidao pessoas={pessoas} />
        <Onda pos={[PE_ESCADA[0] + 1.6, 0.02, PE_ESCADA[2] + 5]} k={rampa(t, T.sobram + 0.2, T.sobram + 1.2, Easing.out(Easing.quad))} cor={tema.acento} raio={3} />
      </CanvasCinema>
      <Carimbo texto="SOBRAM 10" k={rampa(t, T.sobram + 0.1, T.sobram + 0.4, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 11 · por cima do ombro da atendente: "quem aceita ir em outro voo?"
const C11Voluntarios: Cena['render'] = ({t, k}) => {
  const alvos = [...busto(GRUPO[0]), ...busto(GRUPO[4])];
  const cam = sobreOmbro(k, t, {boneco: {pos: AGENTE, rotY: 0}, alvos, lado: -1});
  const foco = focoPuxado(cam, [AGENTE[0], 1.6, AGENTE[2]], GRUPO[2], rampa(t, T.voluntarios - 0.2, T.voluntarios + 0.5), 1.8, 3);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={foco}>
        <Patio luzes={false} />
        <Solido id="balcao">
          <Balcao tema={tema} pos={BALCAO} />
        </Solido>
        <Boneco tema={tema} id="atendente" pos={AGENTE} rotY={0} pose={{maoE: {alvo: [AGENTE[0] - 0.25, 1.75, AGENTE[2] + 0.45], k: rampa(t, T.voluntarios - 0.3, T.voluntarios + 0.2)}}} />
        <Fila t={t} n={10} />
      </CanvasCinema>
      <Linha>
        <Chip texto="PROCURAM-SE VOLUNTÁRIOS" k={rampa(t, T.voluntarios, T.voluntarios + 0.3)} destaque tam={28} />
      </Linha>
    </>
  );
};

// 12 · detalhe no balcão: em troca de quê? (dinheiro, milhas, hotel) — e isso se negocia
const C12Troca: Cena['render'] = ({t, k}) => {
  const c: V3 = [BALCAO[0], TAMPO, BALCAO[2]];
  const cam = camera(k, t, {alvos: cantos([c[0], c[1] + 0.25, c[2]], [1.9, 0.5, 0.7]), de: [18, 34], empurra: 0.22});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [c[0], c[1] + 0.1, c[2]], 1.3, 3)}>
        <Patio luzes={false} />
        <Balcao tema={tema} pos={BALCAO} />
        <Moedas t={t} pos={[c[0] - 0.6, c[1], c[2]]} n={9} ini={T.dinheiro - 0.15} />
        <Entra t={t} em={T.milhas - 0.1} modo="cai" altura={0.7}>
          <CartaoMilhas tema={tema} pos={[c[0], c[1], c[2] + 0.05]} rotY={0.3} />
        </Entra>
        <Entra t={t} em={T.hotel1 - 0.05} modo="cai" altura={0.7}>
          <Chave tema={tema} pos={[c[0] + 0.62, c[1], c[2]]} rotY={-0.5} />
        </Entra>
      </CanvasCinema>
      <Linha>
        <Chip texto="DINHEIRO" k={rampa(t, T.dinheiro, T.dinheiro + 0.25)} tam={28} />
        <Chip texto="MILHAS" k={rampa(t, T.milhas, T.milhas + 0.25)} tam={28} />
        <Chip texto="HOTEL" k={rampa(t, T.hotel1 + 0.2, T.hotel1 + 0.45)} tam={28} />
      </Linha>
      <Carimbo texto="SE NEGOCIA" k={rampa(t, T.negocia, T.negocia + 0.3, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 13 · contra-plongée: você ficou de fora (a porta do avião apaga)
const VOCE_FORA: V3 = [PE_ESCADA[0] + 1.3, 0, PE_ESCADA[2] + 1.4];
const C13Fora: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...pessoa(VOCE_FORA), [PORTA[0], PORTA[1] + 1.8, PORTA[2]], [PORTA[0] - 1.5, PORTA[1] + 1.8, PORTA[2]]], de: [40, -2], empurra: 0.14, sentido: -1, mao: 1.2});
  const porta = 1 - rampa(t, T.fora, T.fora + 0.8);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focoPuxado(cam, [PORTA[0], PORTA[1] + 1, PORTA[2]], [VOCE_FORA[0], 1.6, VOCE_FORA[2]], rampa(t, T.fora - 0.2, T.fora + 0.5), 2.4, 3)}>
        <Patio luzes={false} />
        <Aviao tema={tema} porta={porta} />
        <Escada tema={tema} />
        <Boneco tema={tema} id="voce" pos={VOCE_FORA} rotY={Math.PI * 1.15} cor={tema.acento} pose={{cabeca: [-0.25, 0, 0]}} />
      </CanvasCinema>
      <Linha>
        <Chip texto="NINGUÉM TOPOU" k={rampa(t, T.ninguem, T.ninguem + 0.3)} tam={28} />
      </Linha>
      <Carimbo texto="FICOU DE FORA" k={rampa(t, T.vontade - 0.2, T.vontade + 0.1, Easing.out(Easing.back(2)))} tam={56} />
    </>
  );
};

// 14 · esquema: a regra da ANAC (o recibo desliza no balcão)
const C14Regra: Cena['render'] = ({t, k}) => {
  const c: V3 = [BALCAO[0], TAMPO, BALCAO[2]];
  const cam = camera(k, t, {alvos: cantos([c[0], c[1] + 0.05, c[2]], [1.8, 0.1, 0.8]), de: [0, 78], empurra: 0.1, arco: 0.1});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, c, 1.2, 2)}>
        <Patio luzes={false} />
        <Balcao tema={tema} pos={BALCAO} />
        <Entra t={t} em={T.naHora - 0.4} modo="desliza" de="frente" distancia={1.4} dur={0.6}>
          <Placa tema={tema} pos={[c[0], c[1] + 0.012, c[2]]} rot={[-Math.PI / 2, 0, 0.08]} larg={1.1} alt={0.6} linhas={[{t: 'COMPENSAÇÃO', tam: 120, cor: '#1E1D1B'}, {t: 'NA HORA', tam: 150, cor: tema.acento}]} fundo="#F2F2EE" />
        </Entra>
      </CanvasCinema>
      <Cartao
        titulo="REGRA DA ANAC (RES. 400)"
        k={rampa(t, T.anac - 0.1, T.anac + 0.3)}
        linhas={[
          {texto: 'Voluntários primeiro', k: rampa(t, T.anac, T.anac + 0.3)},
          {texto: 'Ficou de fora? Paga', k: rampa(t, T.naHora - 0.3, T.naHora), destaque: true},
        ]}
      />
    </>
  );
};

// 15 · número: quase R$ 2 mil no nacional; no internacional, o dobro (um número por vez, sem nada passando por cima)
const C15Valor: Cena['render'] = ({t, k}) => {
  const A: V3 = [-0.45, 0, 20];
  const B: V3 = [0.45, 0, 20];
  const r = 0.26;
  const cam = camera(k, t, {alvos: cantos([0, 0.75, 20], [1.6, 1.5, 0.6]), de: [-14, 14], empurra: 0.12});
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focar(cam, [0, 0.5, 20], 1.6, 3)}>
        <Patio luzes={false} />
        <Moedas t={t} pos={A} n={6} ini={T.doisMil - 0.3} r={r} ritmo={0.12} />
        <Moedas t={t} pos={B} n={12} ini={T.internacional - 0.1} r={r} ritmo={0.1} />
      </CanvasCinema>
      <Numero valor={`≈ R$ ${conta(0, 1850, rampa(t, T.doisMil - 0.2, T.doisMil + 0.8))}`} rotulo="NACIONAL" k={janela(t, T.doisMil - 0.2, T.internacional)} />
      <Numero valor={`≈ R$ ${conta(1850, 3700, rampa(t, T.dobro - 0.2, T.dobro + 0.6))}`} rotulo="INTERNACIONAL · O DOBRO" k={rampa(t, T.internacional, T.internacional + 0.3)} />
    </>
  );
};

// 16 · de cima: você escolhe — 3 caminhos acendem (outro voo, reembolso, outro jeito)
const CENTRO: V3 = [-14, 0, 14];
const DESTINOS: V3[] = [
  [CENTRO[0] - 2.6, 0, CENTRO[2] - 2.6],
  [CENTRO[0], 0, CENTRO[2] - 3.4],
  [CENTRO[0] + 2.6, 0, CENTRO[2] - 2.6],
];
const C16Escolhe: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([CENTRO[0], 0.6, CENTRO[2] - 1.6], [6.6, 1.2, 4.6]), de: [0, 58], empurra: 0.12, sentido: -1});
  const caminho = (d: V3): V3[] => [
    [CENTRO[0], 0.05, CENTRO[2] - 0.4],
    [d[0], 0.05, d[2] + 0.9],
  ];
  const tempos = [T.outroVoo, T.reembolso, T.outroJeito];
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio luzes={false} />
        <Boneco tema={tema} id="voce" pos={CENTRO} rotY={Math.PI} cor={tema.acento} />
        <Entra t={t} em={T.outroVoo - 0.2} modo="cai" altura={1.2}>
          <group position={[DESTINOS[0][0], 0, DESTINOS[0][2]]} rotation={[0, 0.6, 0]} scale={0.09}>
            <Aviao tema={tema} janelas={0} trem={1} />
          </group>
        </Entra>
        <Moedas t={t} pos={DESTINOS[1]} n={6} ini={T.reembolso - 0.2} r={0.3} />
        <Entra t={t} em={T.outroJeito - 0.3} modo="desliza" de="direita" distancia={4}>
          <Carro tema={tema} pos={DESTINOS[2]} rotY={-0.5} />
        </Entra>
        {DESTINOS.map((d, i) => (
          <Rastro key={i} caminho={caminho(d)} k={rampa(t, tempos[i] - 0.1, tempos[i] + 0.5)} cauda={1} n={40} r={0.05} />
        ))}
      </CanvasCinema>
      <Linha>
        <Chip texto="OUTRO VOO" k={rampa(t, T.outroVoo, T.outroVoo + 0.25)} tam={26} />
        <Chip texto="REEMBOLSO" k={rampa(t, T.reembolso, T.reembolso + 0.25)} tam={26} />
        <Chip texto="OUTRO JEITO" k={rampa(t, T.outroJeito, T.outroJeito + 0.25)} tam={26} />
      </Linha>
    </>
  );
};

// 17 · macro: esperou 2 horas (o ponteiro dá 2 voltas) → comida
const RELOGIO: V3 = [-20, 0, 6];
const C17Comida: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos([RELOGIO[0], 1.0, RELOGIO[2]], [1.9, 2.0, 0.4]), ...cantos([RELOGIO[0] + 1.3, 0.1, RELOGIO[2] + 0.4], [0.9, 0.2, 0.6])], de: [-12, 6], empurra: 0.2});
  const min = 120 * rampa(t, T.esperou, T.esperou + 1.4, Easing.inOut(Easing.cubic));
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focoPuxado(cam, [RELOGIO[0], 1.0, RELOGIO[2]], [RELOGIO[0] + 1.3, 0.1, RELOGIO[2] + 0.4], rampa(t, T.comida - 0.2, T.comida + 0.4), 1.6, 3)}>
        <Patio luzes={false} />
        <Relogio tema={tema} pos={RELOGIO} minutos={min} />
        <Entra t={t} em={T.comida} modo="cai" altura={1.0}>
          <Bandeja tema={tema} pos={[RELOGIO[0] + 1.3, 0, RELOGIO[2] + 0.4]} />
        </Entra>
      </CanvasCinema>
      <Numero valor={`+${Math.floor(min / 60)}h${String(Math.floor(min % 60)).padStart(2, '0')}`} rotulo="ESPERANDO" k={rampa(t, T.esperou, T.esperou + 0.3)} />
      <Linha y={Y_BAIXO}>
        <Chip texto="DIREITO A COMIDA" k={rampa(t, T.comida + 0.1, T.comida + 0.4)} destaque />
      </Linha>
    </>
  );
};

// 18 · médio: se tiver que dormir, hotel (a cama desliza, a chave cai)
const CAMA: V3 = [-26, 0, 14];
const C18Hotel: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([CAMA[0], 0.5, CAMA[2]], [1.8, 1.0, 2.3]), de: [35, 26], empurra: 0.16, sentido: -1});
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio luzes={false} />
        <Entra t={t} em={T.dormir - 0.35} modo="desliza" de="esquerda" distancia={4} dur={0.6}>
          <Cama tema={tema} pos={CAMA} />
        </Entra>
        <Entra t={t} em={T.hotel2} modo="cai" altura={0.8}>
          <Chave tema={tema} pos={[CAMA[0] + 0.2, 0.68, CAMA[2] + 0.3]} rotY={0.6} />
        </Entra>
      </CanvasCinema>
      <Carimbo texto="HOTEL" k={rampa(t, T.hotel2, T.hotel2 + 0.3, Easing.out(Easing.back(2)))} />
    </>
  );
};

// 19 · médio de frente: no portão, quando pedirem voluntário... você levanta a mão
const C19Portao: Cena['render'] = ({t, k}) => {
  const alvos = [...busto(GRUPO[0]), ...busto(GRUPO[4]), [BALCAO[0] + 1.5, 2.9, BALCAO[2] - 0.2] as V3];
  const cam = camera(k, t, {alvos, de: [18, 14], empurra: 0.14});
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio luzes={false} />
        <Solido id="balcao">
          <Balcao tema={tema} pos={BALCAO} />
        </Solido>
        <Fila t={t} n={10} mao={rampa(t, T.voluntario, T.voluntario + 0.6, Easing.out(Easing.cubic))} />
      </CanvasCinema>
      <Linha>
        <Chip texto="PEDIRAM VOLUNTÁRIO?" k={rampa(t, T.voluntario, T.voluntario + 0.3)} tam={28} />
      </Linha>
    </>
  );
};

// 20 · geral (grua subindo): o pátio inteiro — dá pra negociar
const C20Final: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([4, 2, 3], [30, 4, 12]), de: [40, 24], empurra: -0.12, grua: 0.3});
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Patio />
        <Aviao tema={tema} porta={1} />
        <Escada tema={tema} />
        <Balcao tema={tema} pos={BALCAO} />
        <Fila t={t} n={10} mao={1} />
      </CanvasCinema>
      <Carimbo texto="DÁ PRA NEGOCIAR" k={rampa(t, T.negociar - 0.1, T.negociar + 0.2, Easing.out(Easing.back(2)))} />
      <Linha y={Y_BAIXO}>
        <Chip texto="SALVA E MANDA PRA QUEM VIAJA" k={janela(t, T.salva, 99)} tam={26} />
      </Linha>
    </>
  );
};

// ---------- 4. A lista de cenas (o "roteiro visual") ----------
const CENAS: Cena[] = [
  {em: 0, plano: 'cima', nome: 'passagens caem nos assentos', render: C1Gancho},
  {em: T.faz, plano: 'close', nome: 'as 10 a mais', render: C2Proposito},
  {em: T.porque, plano: 'medio', nome: 'quem não aparece', render: C3NoShow},
  {em: T.perde - 0.1, plano: 'detalhe', nome: 'a poltrona vazia', render: C4Motivos},
  {em: T.olha - 0.1, plano: 'grafico', nome: 'histórico da rota', render: C5Historico},
  {em: T.exemplo - 0.1, plano: 'geral', nome: 'avião de 180', render: C6Aviao180},
  {em: T.conta - 0.15, plano: 'esquema', nome: 'a conta: 190', render: C7Conta},
  {em: T.quaseSempre - 0.1, plano: 'contra', nome: 'decola lotado', render: C8Lotado},
  {em: T.masAs - 0.1, plano: 'cima', nome: 'todo mundo veio', render: C9Todos},
  {em: T.sobram - 0.5, plano: 'medio', nome: 'sobram 10', render: C10Sobram},
  {em: T.ai - 0.1, plano: 'ombro', nome: 'pedir voluntários', render: C11Voluntarios},
  {em: T.quemAceita - 0.1, plano: 'detalhe', nome: 'em troca de quê', render: C12Troca},
  {em: T.ninguem - 0.1, plano: 'contra', nome: 'você de fora', render: C13Fora},
  {em: T.anac - 0.15, plano: 'esquema', nome: 'a regra da ANAC', render: C14Regra},
  {em: T.doisMil - 0.35, plano: 'numero', nome: 'R$ 2 mil / o dobro', render: C15Valor},
  {em: T.escolhe - 0.1, plano: 'cima', nome: 'você escolhe', render: C16Escolhe},
  {em: T.esperou - 0.1, plano: 'macro', nome: '2 horas: comida', render: C17Comida},
  {em: T.dormir - 0.4, plano: 'medio', nome: 'dormir: hotel', render: C18Hotel},
  {em: T.entao - 0.1, plano: 'ombro', nome: 'no portão', render: C19Portao},
  {em: T.sabe2 - 0.1, plano: 'geral', nome: 'dá pra negociar', render: C20Final},
];

// a pílula de estado: o "capítulo" (uma palavra)
const ESTADOS: [number, string][] = [
  [0, 'VENDA'],
  [T.porque, 'NO-SHOW'],
  [T.olha, 'PREVISÃO'],
  [T.quaseSempre, 'LOTADO'],
  [T.masAs, 'TODOS VIERAM'],
  [T.ai, 'VOLUNTÁRIOS'],
  [T.ninguem, 'COMPENSAÇÃO'],
  [T.escolhe, 'SEUS DIREITOS'],
  [T.entao, 'NEGOCIE'],
];

// efeitos nos momentos-chave (o whoosh de cada corte e o tique da pílula já vêm sozinhos)
const SONS = [
  {t: T.proposito, f: 'impacto', v: 0.35},
  {t: T.naoAparece, f: 'pop', v: 0.3},
  {t: T.preve, f: 'ding', v: 0.3},
  {t: T.v190, f: 'ding', v: 0.32},
  {t: T.sobram, f: 'baque', v: 0.35},
  {t: T.dinheiro, f: 'pop', v: 0.28},
  {t: T.milhas, f: 'pop', v: 0.28},
  {t: T.hotel1, f: 'pop', v: 0.28},
  {t: T.vontade, f: 'baque', v: 0.32},
  {t: T.dobro, f: 'impacto', v: 0.32},
  {t: T.comida, f: 'pop', v: 0.28},
  {t: T.negociar, f: 'ding', v: 0.35},
];

export const Overbooking: React.FC<{guia?: boolean; semInterface?: boolean}> = ({guia, semInterface}) => (
  <VideoKit
    pasta={P}
    assunto="OVERBOOKING"
    palavras={PALAVRAS}
    audioSeg={AUDIO_SEG}
    cenas={CENAS}
    estados={ESTADOS}
    sons={SONS}
    narracao="audio/narracao-norm.mp3"
    trilha="sfx/trilha.mp3"
    guia={guia}
    semInterface={semInterface}
  />
);
