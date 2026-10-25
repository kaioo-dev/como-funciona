// O vídeo pronto (v1.2): palco 3D de cinema + toda a parte "chata" (cortes, legenda, pílula, marca, áudio, sons).
// Um vídeo novo é SÓ a lista de cenas. Veja src/videos/_modelo/Modelo.tsx (comece copiando ele) e o exemplo
// src/videos/overbooking/Overbooking.tsx (a referência de qualidade).
import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AcabamentoCinema, Camera, Palco, type Cam, type Foco, type V3} from './pecas';
import {QaCena, QA_LIGADO, qaLog} from './qa';
import {focoAuto, W, H} from './camera';
import {TEMA, SERIE} from './ativo';
import {GuiaReels} from './reels';
import {Marca, Pilula, criaLegenda, type Palavra} from './ui';

export const FPS = 30;
// duração da composição: a narração + 1,2 s de respiro no fim
export const duracao = (audioSeg: number) => Math.round((audioSeg + 1.2) * FPS);

// ---------- Primeiro plano desfocado (bokeh entre a câmera e o assunto) ----------
const geoBola = new THREE.SphereGeometry(1, 20, 14);
const PrimeiroPlano: React.FC<{cam: Cam; n: number}> = ({cam, n}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: TEMA.tinta, transparent: true, opacity: TEMA.nome === 'creme' ? 0.1 : 0.12, depthWrite: false, toneMapped: false}), []);
  const v = new THREE.Vector3(...cam.alvo).sub(new THREE.Vector3(...cam.pos));
  const d = v.length();
  const dir = v.clone().normalize();
  const lado = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const cima = new THREE.Vector3().crossVectors(lado, dir).normalize();
  return (
    <group userData={{qa: 'frente'}}>
      {Array.from({length: n}, (_, i) => {
        const u = 0.24 + ((i * 0.37) % 1) * 0.2;
        const sx = ((i * 0.61) % 1) - 0.5;
        const sy = ((i * 0.43) % 1) - 0.5;
        const p = new THREE.Vector3(...cam.pos)
          .addScaledVector(dir, d * u)
          .addScaledVector(lado, sx * d * 0.34 + Math.sign(sx || 1) * d * 0.08)
          .addScaledVector(cima, sy * d * 0.5);
        return <mesh key={i} position={p} scale={d * (0.012 + ((i * 0.29) % 1) * 0.014)} geometry={geoBola} material={mat} />;
      })}
    </group>
  );
};

// ---------- Poeira de fundo (sempre ATRÁS do assunto e do tamanho da cena) ----------
const geoGrao = new THREE.SphereGeometry(1, 12, 8);
const Poeira: React.FC<{cam: Cam; t: number; n?: number}> = ({cam, t, n = 36}) => {
  const base = useMemo(() => {
    let k = 7;
    const rnd = () => {
      k = (k * 16807) % 2147483647;
      return (k % 10000) / 10000;
    };
    return Array.from({length: n}, () => ({x: rnd() - 0.5, y: rnd(), z: rnd(), v: 0.04 + rnd() * 0.08, r: 0.5 + rnd(), f: rnd() * 6}));
  }, [n]);
  const a = new THREE.Vector3(...cam.alvo);
  const p0 = new THREE.Vector3(...cam.pos);
  const d = a.distanceTo(p0);
  const dir = a.clone().sub(p0).normalize();
  const lado = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const m = new THREE.Object3D();
  const largura = d * Math.tan((cam.fov * Math.PI) / 360) * 1.3;
  const preparar = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    base.forEach((g, i) => {
      const y = (g.y + t * g.v) % 1;
      const fundo = d * (0.35 + g.z * 0.9); // de 35% a 125% da distância ATRÁS do alvo
      const pos = a.clone().addScaledVector(dir, fundo).addScaledVector(lado, g.x * largura * 2 * (1 + fundo / d)).add(new THREE.Vector3(0, (y - 0.5) * largura * 3.2 * (1 + fundo / d) + Math.sin(t * 0.4 + g.f) * d * 0.01, 0));
      m.position.copy(pos);
      m.scale.setScalar(d * 0.0026 * g.r * (1 + fundo / d) * Math.sin(Math.PI * y));
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <instancedMesh ref={preparar} args={[geoGrao, undefined, n]} userData={{qa: 'particula'}} frustumCulled={false}>
      <meshBasicMaterial color={TEMA.tinta} transparent opacity={0.32} toneMapped={false} depthWrite={false} />
    </instancedMesh>
  );
};

// Cada cena abre um contexto WebGL; o navegador só aguenta ~16 ao mesmo tempo. Quando a cena sai, devolvemos o dela
// (sem isso, um vídeo com 20 cenas trava no render na 17ª).
const Liberar: React.FC = () => {
  const gl = useThree((st) => st.gl);
  useEffect(
    () => () => {
      gl.dispose();
      gl.forceContextLoss();
    },
    [gl],
  );
  return null;
};

// ---------- O palco de cinema de toda cena ----------
// cam: de camera()/sobreOmbro() (src/base/camera). foco: padrão = no centro dos alvos da câmera, raso.
// frente: bolas de bokeh na frente da lente (0 desliga). poeira: grãos atrás do assunto (false desliga).
export const CanvasCinema: React.FC<{cam: Cam; foco?: Foco; t?: number; children: React.ReactNode; sombraArea?: number; frente?: number; poeira?: boolean; palco?: boolean}> = ({
  cam,
  foco,
  t = 0,
  children,
  sombraArea = 10,
  frente = 2,
  poeira = true,
  palco = true,
}) => (
  // na checagem automática: ¼ da resolução e sem sombra (a imagem só serve para medir pisca; o vídeo final não muda)
  <ThreeCanvas width={W} height={H} shadows={QA_LIGADO ? false : 'soft'} dpr={QA_LIGADO ? 0.25 : 1} gl={{antialias: false, toneMapping: THREE.NoToneMapping}} camera={{fov: cam.fov, position: cam.pos}}>
    {palco ? <Palco tema={TEMA} alcance={Math.max(60, Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2]) * 3)} sombraArea={sombraArea} /> : null}
    <Camera {...cam} />
    {children}
    {frente > 0 ? <PrimeiroPlano cam={cam} n={frente} /> : null}
    {poeira ? <Poeira cam={cam} t={t} /> : null}
    <AcabamentoCinema foco={foco ?? focoAuto(cam)} raioAO={0.6} />
    {QA_LIGADO ? <QaCena cam={cam} /> : null}
    <Liberar />
  </ThreeCanvas>
);

// ---------- O vídeo ----------
// Tipos de plano: varie a cada corte (a checagem reclama de dois iguais seguidos).
export type TipoPlano = 'geral' | 'medio' | 'close' | 'detalhe' | 'cima' | 'ombro' | 'corte' | 'esquema' | 'numero' | 'grafico' | 'contra' | 'macro';
export type Cena = {
  em: number; // quando a cena começa (T.xxx; a 1ª é 0)
  plano: TipoPlano;
  nome: string; // curto, aparece na checagem e na folha de revisão
  render: (c: {t: number; ini: number; fim: number; k: number}) => React.ReactNode;
};
export type Som = {t: number; f: string; v?: number};

export const VideoKit: React.FC<{
  pasta: string; // '002. micro-ondas' (pasta em projetos/)
  assunto: string; // vai no topo: "SÉRIE · ASSUNTO"
  palavras: Palavra[];
  audioSeg: number;
  cenas: Cena[];
  estados: [number, string][]; // [tempo, 'PALAVRA'] da pílula de estado
  sons?: Som[]; // efeitos nos momentos-chave (o whoosh dos cortes e o tique das trocas de estado já vêm sozinhos)
  narracao?: string; // padrão: audio/narracao-norm.wav
  trilha?: string | null; // padrão: sfx/trilha.wav (null = sem trilha)
  volumeTrilha?: number;
  guia?: boolean;
  semInterface?: boolean;
  semCortes?: boolean;
}> = ({pasta, assunto, palavras, audioSeg, cenas, estados, sons = [], narracao = 'audio/narracao-norm.wav', trilha = 'sfx/trilha.wav', volumeTrilha = 0.12, guia, semInterface, semCortes}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const Legenda = useMemo(() => criaLegenda(palavras), [palavras]);
  const ordenadas = useMemo(() => {
    for (let i = 1; i < cenas.length; i++) if (!(cenas[i].em > cenas[i - 1].em)) throw new Error(`As cenas precisam estar em ordem de tempo: "${cenas[i].nome}" (${cenas[i].em.toFixed(2)} s) começa antes de "${cenas[i - 1].nome}".`);
    return cenas;
  }, [cenas]);
  let i = 0;
  for (let k = 0; k < ordenadas.length; k++) if (ordenadas[k].em <= t) i = k;
  const ini = i === 0 ? 0 : ordenadas[i].em;
  const fim = i + 1 < ordenadas.length ? ordenadas[i + 1].em : durationInFrames / fps;
  const k = interpolate(t, [ini, fim], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  let e = 0;
  for (let j = 0; j < estados.length; j++) if (estados[j][0] <= t) e = j;
  // corte do canal: leve zoom 1,03 → 1 com desfoque 12 → 0 px em 0,4 s
  const dt = t - ini;
  const zoom = semCortes ? 1 : 1 + 0.03 * (1 - interpolate(dt, [0, 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}));
  const desfoque = semCortes || i === 0 ? 0 : interpolate(dt, [0, 0.4], [12, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const preto = Math.max(interpolate(t, [0, 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), interpolate(frame, [durationInFrames - 15, durationInFrames - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const todosSons = useMemo(() => {
    const s: Som[] = [];
    ordenadas.slice(1).forEach((c) => s.push({t: c.em - 0.12, f: 'whoosh', v: 0.22}));
    estados.slice(1).forEach(([te]) => s.push({t: te, f: 'tique', v: 0.26}));
    return [...s, ...sons].filter((x) => x.t >= 0 && x.t < audioSeg + 1);
  }, [ordenadas, estados, sons, audioSeg]);
  useLayoutEffect(() => {
    if (!QA_LIGADO) return;
    qaLog({q: frame, tipo: 'video', cena: i, nome: ordenadas[i].nome, serie: SERIE, assunto, dur: durationInFrames / fps, cenas: ordenadas.map((c) => ({em: Math.round(c.em * 100) / 100, plano: c.plano, nome: c.nome}))});
  });
  return (
    <AbsoluteFill style={{backgroundColor: TEMA.fundo}} data-qa3d={QA_LIGADO || semInterface ? '' : undefined}>
      {/* só o 3D aparece: na checagem (o detector de pisca não confunde texto entrando com luz piscando) e na versão
          Limpo (fundo da capa, sem chips, carimbos nem etiquetas) */}
      {QA_LIGADO || semInterface ? <style>{'[data-qa3d] * {visibility: hidden !important} [data-qa3d] canvas {visibility: visible !important}'}</style> : null}
      <AbsoluteFill style={{transform: `scale(${zoom})`, filter: desfoque > 0.2 ? `blur(${desfoque}px)` : undefined}}>{ordenadas[i].render({t, ini, fim, k})}</AbsoluteFill>
      {preto > 0 ? <AbsoluteFill style={{backgroundColor: '#05070A', opacity: preto, pointerEvents: 'none'}} /> : null}
      {semInterface ? null : (
        <>
          <Marca assunto={assunto} />
          <Pilula estado={estados[e][1]} t={t} troca={estados[e][0]} />
          <Legenda t={t} />
        </>
      )}
      <Audio src={staticFile(`${pasta}/${narracao}`)} />
      {trilha ? <Audio src={staticFile(`${pasta}/${trilha}`)} loop volume={(f) => interpolate(f / fps, [0, 0.4, audioSeg - 1, audioSeg + 1.2], [0, volumeTrilha, volumeTrilha, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} /> : null}
      {todosSons.map((s, k2) => (
        <Sequence key={k2} from={Math.round(s.t * fps)} durationInFrames={Math.round(1.6 * fps)} layout="none">
          <Audio src={staticFile(`${pasta}/sfx/${s.f}.wav`)} volume={s.v ?? 0.3} />
        </Sequence>
      ))}
      {guia ? <GuiaReels /> : null}
    </AbsoluteFill>
  );
};
export type {V3, Cam, Foco};
