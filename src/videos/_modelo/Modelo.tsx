// MODELO DE VÍDEO (v1.2) — comece todo vídeo novo copiando esta pasta para src/videos/<slug>/.
// ANTES de tudo, os sons do projeto (sem eles o vídeo fica mudo ou dá erro de arquivo):
//   copie projetos/001. overbooking/sfx/*.wav para projetos/<NNN. slug>/sfx/ e gere a trilha (gerar_trilha.py).
// Referência completa (20 cenas): src/videos/overbooking/Overbooking.tsx. Regras: skill `diretor`.
//
// O ritmo dos vídeos que viralizam já está aqui dentro:
//   • 1 cena a cada 2,5–4 s (≈ 18–24 cenas num vídeo de 70 s); nenhuma passa de ~6 s;
//   • cada corte muda o TIPO de plano (cima → close → médio → esquema → número → contra…);
//   • cada cena explica UM detalhe com um elemento só dela (número, gráfico, corte, etiqueta, caminho aceso);
//   • algo se mexe desde o 1º quadro; a câmera nunca para (push-in/arco); nada surge do nada (<Entra>).
// Passos: (1) T com as frases da fala; (2) o MUNDO (posições fixas, um lugar só); (3) uma função por cena;
// (4) a lista CENAS; (5) ESTADOS da pílula; (6) SONS dos momentos-chave. Registre no Root.tsx (veja o fim do arquivo).
import React from 'react';
import {VideoKit, CanvasCinema, camera, cantos, pessoa, focoPuxado, pj, criaQuando, rampa, duracao, Entra, Rastro, Boneco, Caixa, Solido, Chip, Linha, Carimbo, Numero, Etiqueta, conta, TEMA as tema, CORES, Easing, type Cena, type V3} from '../../base/kit';
import {PALAVRAS} from './palavras';

export const AUDIO_SEG = 13.2; // ffprobe da narracao-norm.wav
export const FPS = 30;
export const QUADROS = duracao(AUDIO_SEG);
const P = '000. modelo'; // pasta em projetos/ (NNN. slug)

// ---------- 1. Tempos pela fala (trechos únicos; se repetir, use mais palavras ou quando('x', 2)) ----------
const quando = criaQuando(PALAVRAS);
const T = {
  gancho: 0,
  sabe: quando('Sabe por quê'),
  detalhe1: quando('Primeiro detalhe'),
  mecanismo: quando('mecanismo'),
  detalhe2: quando('Segundo detalhe'),
  numero: quando('um número'),
  virada: quando('Mas tem uma virada'),
  salva: quando('Salva e manda'),
};

// ---------- 2. O mundo: um lugar só, medidas fixas, visto de câmeras diferentes ----------
const MESA = {pos: [0, 0.45, 0] as V3, args: [1.8, 0.9, 0.9] as V3};
const TOPO = MESA.pos[1] + MESA.args[1] / 2; // tampo: o que fica em cima apoia aqui
const OBJ = {pos: [0.2, TOPO + 0.2, 0] as V3, args: [0.5, 0.4, 0.4] as V3};
const VOCE: V3 = [0.9, 0, 1.2];
const Mundo: React.FC<{t: number}> = ({t}) => (
  <>
    <Solido id="mesa">
      <Caixa args={MESA.args} position={MESA.pos} cor={CORES.escuro} raio={0.05} />
    </Solido>
    <Solido id="objeto">
      <Caixa args={OBJ.args} position={OBJ.pos} cor={CORES.medio} raio={0.08} />
    </Solido>
    <Boneco tema={tema} id="voce" pos={VOCE} rotY={Math.PI + 0.6} pose={{cabeca: [Math.sin(t) * 0.04, 0, 0]}} />
  </>
);

// ---------- 3. Cenas (cada uma: câmera por camera(), o mundo, 1 elemento que explica, texto curto) ----------
const C1Gancho: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos(MESA.pos, MESA.args), ...pessoa(VOCE)], de: [30, 14], empurra: 0.2});
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Mundo t={t} />
      </CanvasCinema>
      <Carimbo texto="A VIRADA EM 2 PALAVRAS" k={rampa(t, 1.2, 1.5, Easing.out(Easing.back(2)))} />
    </>
  );
};
const C2Detalhe: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos(OBJ.pos, OBJ.args), de: [-25, 30], empurra: 0.22, sentido: -1});
  const pObj = pj(OBJ.pos, cam);
  return (
    <>
      <CanvasCinema cam={cam} t={t} foco={focoPuxado(cam, MESA.pos, OBJ.pos, rampa(t, T.mecanismo - 0.3, T.mecanismo + 0.3), 1.4)}>
        <Mundo t={t} />
        <Entra t={t} em={T.mecanismo} modo="cai" altura={0.8}>
          <Caixa args={[0.12, 0.12, 0.12]} position={[OBJ.pos[0], OBJ.pos[1] + OBJ.args[1] / 2 + 0.06, 0]} cor={tema.acento} raio={0.03} />
        </Entra>
      </CanvasCinema>
      <Etiqueta x={560} y={600} alvo={pObj} titulo="A peça" sub="O QUE FAZ" destaque aparece={rampa(t, T.detalhe1, T.detalhe1 + 0.5, Easing.linear)} />
    </>
  );
};
const C3Numero: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: cantos([0, TOPO + 0.3, 0], [1.6, 0.6, 0.6]), de: [0, 60], empurra: 0.12});
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Mundo t={t} />
        <Rastro caminho={[[-0.8, TOPO + 0.05, 0.3], [0.2, TOPO + 0.05, 0.3], [0.2, TOPO + 0.4, 0]]} k={rampa(t, T.detalhe2, T.numero + 0.4)} cauda={1} n={50} r={0.018} />
      </CanvasCinema>
      <Numero valor={conta(0, 2.45, rampa(t, T.numero - 0.2, T.numero + 0.6), 2)} unidade="GHz" rotulo="O NÚMERO" k={rampa(t, T.numero - 0.2, T.numero + 0.2)} />
    </>
  );
};
const C4Virada: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...pessoa(VOCE), ...cantos(OBJ.pos, OBJ.args)], de: [150, 4], empurra: 0.16});
  return (
    <>
      <CanvasCinema cam={cam} t={t}>
        <Mundo t={t} />
      </CanvasCinema>
      <Linha>
        <Chip texto="A VIRADA" k={rampa(t, T.virada, T.virada + 0.3)} destaque />
      </Linha>
    </>
  );
};
const C5Fecho: Cena['render'] = ({t, k}) => {
  const cam = camera(k, t, {alvos: [...cantos(MESA.pos, MESA.args), ...pessoa(VOCE)], de: [40, 30], empurra: -0.1, grua: 0.3});
  return (
    <CanvasCinema cam={cam} t={t}>
      <Mundo t={t} />
    </CanvasCinema>
  );
};

// ---------- 4. A lista de cenas (num vídeo de verdade: 18–24 linhas, tipos de plano alternando) ----------
const CENAS: Cena[] = [
  {em: 0, plano: 'geral', nome: 'gancho', render: C1Gancho},
  {em: T.detalhe1 - 0.1, plano: 'close', nome: 'o primeiro detalhe', render: C2Detalhe},
  {em: T.detalhe2 - 0.1, plano: 'cima', nome: 'o número', render: C3Numero},
  {em: T.virada - 0.1, plano: 'contra', nome: 'a virada', render: C4Virada},
  {em: T.salva - 0.1, plano: 'geral', nome: 'fecho', render: C5Fecho},
];
// ---------- 5. Pílula de estado (1 palavra por bloco) ----------
const ESTADOS: [number, string][] = [
  [0, 'O GANCHO'],
  [T.detalhe1, 'COMO FUNCIONA'],
  [T.virada, 'A VIRADA'],
];
// ---------- 6. Sons nos momentos-chave (whoosh dos cortes e tique da pílula já são automáticos) ----------
const SONS = [{t: T.mecanismo, f: 'pop', v: 0.3}, {t: T.virada, f: 'impacto', v: 0.35}];

export const Modelo: React.FC<{guia?: boolean; semInterface?: boolean}> = ({guia, semInterface}) => (
  <VideoKit pasta={P} assunto="ASSUNTO" palavras={PALAVRAS} audioSeg={AUDIO_SEG} cenas={CENAS} estados={ESTADOS} sons={SONS} guia={guia} semInterface={semInterface} />
);
// Root.tsx:
// <Folder name="002-slug">
//   <Composition id="Nome" component={Nome} width={1080} height={1920} fps={FPS} durationInFrames={QUADROS} />
//   <Composition id="NomeGuia" component={Nome} defaultProps={{guia: true}} … />
//   <Composition id="NomeLimpo" component={Nome} defaultProps={{semInterface: true}} … />
//   (a Capa só depois da etapa de capa, quando o fundo-limpo-escuro.jpg já existir)
//   <Composition id="CapaNome" component={Capa} defaultProps={{fundo: '002. slug/capa/fundo-limpo-escuro.jpg', tema: 'ASSUNTO', linhas: [...], destaque: 1}} … durationInFrames={1} />
// </Folder>
