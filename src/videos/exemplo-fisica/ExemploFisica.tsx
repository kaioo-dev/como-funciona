import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {AcabamentoCinema, Boneco, Caixa, Camera, Palco, Particulas, cinematizar, type Cam, type Foco, type V3} from '../../base/pecas';
import {Material} from '../../base/materiais';
import {andar, pular, queda, separar, topo, type Superficie} from '../../base/movimento';
import {Solido} from '../../base/qa';
import {MEU_ESTILO} from '../../estilo';

// Exemplo de física do kit (v1.1). Sem narração: é a referência de COMO mover as coisas.
// - o boneco anda por cima das placas (pé travado, passa os vãos, sobe o degrau);
// - para ao lado de dois outros sem atravessar ninguém (`separar`);
// - uma caixa cai e quica de verdade (`queda`);
// - o boneco pula para o bloco mais alto (`pular`);
// - fichas caem e empilham (cada uma pousa no topo da anterior).
// Rode `node scripts/qa.mjs ExemploFisica` para ver a checagem automática passando.

export const FPS = 30;
export const QUADROS = 13 * FPS;
const W = 1080;
const H = 1920;
const tema = MEU_ESTILO;

// ---------- Mundo (as medidas da <Caixa> e da superfície vêm do MESMO lugar) ----------
type Bloco = {id: string; pos: V3; args: V3};
const PLACAS: Bloco[] = Array.from({length: 6}, (_, i) => ({id: `placa${i}`, pos: [-5 + i * 1.35, 0.15, 0] as V3, args: [1.1, 0.3, 1.4] as V3}));
const PALCO: Bloco = {id: 'palco', pos: [4.6, 0.3, 0], args: [3.2, 0.6, 2.4]};
const TORRE: Bloco = {id: 'torre', pos: [7.2, 0.55, 0], args: [1.6, 1.1, 1.6]};
const BLOCOS = [...PLACAS, PALCO, TORRE];
const CHAO: Superficie[] = BLOCOS.map((b) => topo(b.pos, b.args));
const yTopo = (b: Bloco) => b.pos[1] + b.args[1] / 2;

// Quem anda: do começo das placas até o palco
const CAMINHO: V3[] = [
  [-5.2, 0, 0.1],
  [-1, 0, 0.1],
  [3.2, 0, 0.1],
  [4.3, 0, 0.45],
];
const ANDA = {caminho: CAMINHO, ini: 0.6, velocidade: 1.25, chao: CHAO, rotFinal: Math.PI / 2};
const PARADOS: V3[] = [
  [4.9, yTopo(PALCO), -0.25],
  [5.5, yTopo(PALCO), -0.6],
];

const Canvas: React.FC<{cam: Cam; foco: Foco; children: React.ReactNode}> = ({cam, foco, children}) => (
  <ThreeCanvas width={W} height={H} shadows="soft" gl={{antialias: false, toneMapping: THREE.NoToneMapping}} camera={{fov: cam.fov, position: cam.pos}}>
    <Palco tema={tema} alcance={70} sombraArea={12} />
    <Camera {...cam} />
    {children}
    <AcabamentoCinema foco={foco} raioAO={0.7} />
  </ThreeCanvas>
);

export const ExemploFisica: React.FC = () => {
  const q = useCurrentFrame();
  const t = q / FPS;

  // 1) andar (posição, rotação e pose saem prontas)
  const a = andar(t, ANDA);
  // 2) pulo do palco para a torre, depois de chegar
  const tPulo = 9.2;
  const pulo = pular(t, {ini: tPulo, de: [5.85, yTopo(PALCO), 0.45], para: [6.95, yTopo(TORRE), 0.3], altura: 1.0});
  // o boneco que andou vai até a beira antes de pular
  const ateBeira = andar(t, {
    caminho: [
      [4.3, 0, 0.45],
      [5.1, 0, 0.75],
      [5.85, 0, 0.45],
    ],
    ini: 7.6,
    fim: tPulo - 0.05,
    chao: CHAO,
  });
  const fase = t < 7.6 ? a : t < tPulo ? ateBeira : null;

  // 3) ninguém atravessa ninguém: separa os três corpos (os parados são fixos)
  const pAnda = fase ? fase.pos : pulo.pos;
  const [p0, p1, p2] = separar([pAnda, ...PARADOS], 0.32, [false, true, true]);
  const viraPara = t < 7.6 ? a.rotY : fase ? fase.rotY : pulo.rotY;

  // 4) caixa caindo no palco, com quique e amassadinho
  const caixa = queda(t, {ini: 6.2, de: [3.7, 7, -0.6], chaoY: yTopo(PALCO) + 0.25, vel: [0.3, 0, 0], restituicao: 0.4});
  const amassa = 1 - 0.18 * caixa.impacto;
  // 5) fichas caindo e empilhando
  const FICHAS = 5;
  const fichas = Array.from({length: FICHAS}, (_, i) =>
    queda(t, {ini: 10.3 + i * 0.28, de: [7.5, 6 + i * 0.4, -0.45], chaoY: yTopo(TORRE) + 0.06 + i * 0.12, restituicao: 0.3}),
  );

  // Câmera de cinema que acompanha o boneco
  const foco3: V3 = [p0[0], p0[1] + 1.1, p0[2]];
  const base: Cam = {pos: [foco3[0] + 1.6, 3.4, 8.2], alvo: [foco3[0] + 0.6, 1.2, 0], fov: 34};
  const cam = cinematizar(base, Math.min(1, t / 13), {sentido: 1, distMax: 16});
  const foco: Foco = {dist: Math.hypot(cam.pos[0] - foco3[0], cam.pos[1] - foco3[1], cam.pos[2] - foco3[2]), faixa: 1.4, bokeh: 4};

  return (
    <AbsoluteFill style={{background: tema.fundo}}>
      <Canvas cam={cam} foco={foco}>
        {PLACAS.map((b, i) => (
          <Solido key={b.id} id={b.id}>
            <Caixa args={b.args} raio={0.05} position={b.pos} cor={a.s > i * 1.35 + 0.6 ? tema.acento : tema.objeto} emissivo={a.s > i * 1.35 + 0.6 ? 0.25 : 0} />
          </Solido>
        ))}
        <Solido id="palco">
          <Caixa args={PALCO.args} raio={0.06} position={PALCO.pos} cor={tema.objetoClaro} />
        </Solido>
        <Solido id="torre">
          <mesh position={TORRE.pos} castShadow receiveShadow>
            <boxGeometry args={TORRE.args} />
            <Material tipo="madeira" cor={tema.areia} />
          </mesh>
        </Solido>
        <Solido id="caixa">
          <mesh position={caixa.pos} scale={[1 + 0.1 * caixa.impacto, amassa, 1 + 0.1 * caixa.impacto]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <Material tipo="papel" cor={tema.areia} />
          </mesh>
        </Solido>
        {fichas.map((f, i) => (
          <Solido key={i} id={`ficha${i}`} ignora={[`ficha${i - 1}`, `ficha${i + 1}`, 'torre']}>
            <mesh position={f.pos} castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.12, 40]} />
              <Material tipo="metal" cor={tema.acento} />
            </mesh>
          </Solido>
        ))}
        <Boneco id="andando" tema={tema} pos={p0} rotY={viraPara} pose={fase ? fase.pose : pulo.pose} cor={tema.objetoClaro} />
        <Boneco id="parado1" tema={tema} pos={p1} rotY={-Math.PI / 2 - 0.3} pose={{cabeca: [0, Math.sin(t * 0.8) * 0.15, 0]}} cor={tema.acento} />
        <Boneco id="parado2" tema={tema} pos={p2} rotY={-Math.PI / 2 + 0.2} cor={tema.acento} />
        <Particulas t={t} centro={[foco3[0], 2, 0]} raio={6} n={50} />
      </Canvas>
    </AbsoluteFill>
  );
};
