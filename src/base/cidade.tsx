import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Easing, interpolate} from 'remotion';
import {Caixa, Predio, type V3} from './pecas';
import type {Tema} from './tema';

// A cidade vista de cima: dois bancos nas pontas, o Banco Central no meio, prédios genéricos em volta.
// As rotas são fileiras de pontos (laranja = dinheiro; grafite = recado/consulta).

export const SEU: V3 = [-2.6, 0, 2.0];
export const BANCO_B: V3 = [2.6, 0, 2.0];
export const BC: V3 = [0, 0, -2.6];
export const ALT_BANCO = 2.4;
export const ESC_BC = 0.42;
export const topo = (p: V3, alt: number): V3 => [p[0], alt + 0.15, p[2]];
export const TOPO_SEU = topo(SEU, ALT_BANCO);
export const TOPO_B = topo(BANCO_B, ALT_BANCO);
export const TOPO_BC = topo(BC, 10 * ESC_BC);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const mola = Easing.out(Easing.back(1.7));

export const curva = (a: V3, b: V3, h: number, s: number): V3 => {
  const m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
  const u = 1 - s;
  return [u * u * a[0] + 2 * u * s * m[0] + s * s * b[0], u * u * a[1] + 2 * u * s * m[1] + s * s * b[1], u * u * a[2] + 2 * u * s * m[2] + s * s * b[2]];
};

export const viaBC = (a: V3, b: V3, s: number): V3 => (s < 0.5 ? curva(a, TOPO_BC, 1.2, s * 2) : curva(TOPO_BC, b, 1.2, (s - 0.5) * 2));

const G_PONTO = new THREE.SphereGeometry(1, 12, 10);
const mats = new Map<string, THREE.MeshStandardMaterial>();
const mat = (cor: string, opacidade = 1) => {
  const k = `${cor}|${opacidade}`;
  if (!mats.has(k))
    mats.set(k, new THREE.MeshStandardMaterial({color: cor, emissive: cor, emissiveIntensity: 0.35, roughness: 0.4, transparent: opacidade < 1, opacity: opacidade}));
  return mats.get(k)!;
};

// Fileira de pontos ao longo de f(s), desenhada até `prog`. Cada ponto "estala" (cresce e assenta) ao aparecer.
export const Trilha: React.FC<{f: (s: number) => V3; prog: number; cor: string; n?: number; raio?: number; opacidade?: number; cabeca?: number; de?: number}> = ({
  f,
  prog,
  cor,
  n = 28,
  raio = 0.05,
  opacidade = 1,
  cabeca = 0,
  de = 0,
}) => {
  if (prog <= 0) return null;
  const pts: React.ReactNode[] = [];
  const passo = 1 / (n - 1);
  for (let i = 0; i < n; i++) {
    const s = i * passo;
    if (s > prog || s < de) continue;
    const idade = Math.min(1, (prog - s) / (passo * 2.5));
    const esc = raio * interpolate(idade, [0, 0.5, 1], [0, 1.6, 1], clamp);
    pts.push(<mesh key={i} geometry={G_PONTO} material={mat(cor, opacidade)} position={f(s)} scale={esc} />);
  }
  if (cabeca > 0 && prog < 1) pts.push(<mesh key="c" geometry={G_PONTO} material={mat(cor)} position={f(prog)} scale={cabeca} />);
  return <>{pts}</>;
};

// Banco: prédio com colunas e faixa grafite. `pulso` 0..1 faz o prédio dar um "pulinho".
const Banco: React.FC<{tema: Tema; pos: V3; sobe: number; pulso: number}> = ({tema, pos, sobe, pulso}) => {
  if (sobe < 0.03) return null; // antes de subir, não desenha (senão vira uma placa chata no chão)
  const p = Math.sin(Math.PI * Math.min(1, pulso)) * 0.08;
  return (
    <group position={pos} scale={[1 + p * 0.5, Math.max(0.001, sobe) * (1 + p), 1 + p * 0.5]}>
      <Caixa args={[1.8, ALT_BANCO, 1.8]} raio={0.09} cor={tema.branco} position={[0, ALT_BANCO / 2, 0]} />
      <Caixa args={[1.86, 0.22, 1.86]} raio={0.05} cor={tema.tinta} position={[0, ALT_BANCO - 0.32, 0]} />
      <Caixa args={[1.5, 0.12, 0.06]} raio={0.02} cor={tema.tinta} position={[0, 1.75, 0.92]} />
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <Caixa key={x} args={[0.14, 1.5, 0.1]} raio={0.04} cor={tema.branco} position={[x, 0.85, 0.94]} />
      ))}
      <Caixa args={[2.1, 0.12, 2.1]} raio={0.04} cor={tema.branco} position={[0, 0.06, 0]} />
    </group>
  );
};

type PredioG = {p: V3; w: number; d: number; h: number; dist: number};
export const usePredios = () =>
  useMemo(() => {
    const lista: PredioG[] = [];
    let k = 7;
    const rnd = () => {
      k = (k * 16807) % 2147483647;
      return (k % 1000) / 1000;
    };
    for (let x = -12; x <= 12; x += 2.2) {
      for (let z = -13; z <= 9; z += 2.2) {
        const r = rnd();
        const perto = (q: V3, raio: number) => Math.hypot(x - q[0], z - q[2]) < raio;
        if (perto(SEU, 2.0) || perto(BANCO_B, 2.0) || (Math.abs(x) < 2.6 && z > -4.6 && z < -0.6)) continue;
        if (Math.abs(z - 4.6) < 0.5) continue; // avenida
        const teto = z > 3 ? 0.9 : z > 0 ? 1.8 : 3.4;
        const p: V3 = [x + (r - 0.5) * 0.4, 0, z + (rnd() - 0.5) * 0.4];
        lista.push({p, w: 1.1 + rnd() * 0.6, d: 1.1 + rnd() * 0.6, h: 0.4 + rnd() * rnd() * teto, dist: Math.hypot(p[0], p[2])});
      }
    }
    return lista;
  }, []);

export const usePrediosTopo = () => {
  const ps = usePredios();
  return useMemo(() => ps.map((q) => [q.p[0], q.h + 0.1, q.p[2]] as V3), [ps]);
};

// Carrinhos na avenida da frente, indo e voltando (posição só depende do tempo).
const Carros: React.FC<{tema: Tema; t: number}> = ({tema, t}) => (
  <>
    {Array.from({length: 7}).map((_, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const vel = 1.6 + (i % 3) * 0.5;
      const x = ((((i * 3.7 + t * vel * dir) % 26) + 26) % 26) - 13;
      return (
        <group key={i} position={[x, 0, 4.6 + dir * 0.28]}>
          <Caixa args={[0.62, 0.2, 0.3]} raio={0.06} cor={i % 3 === 0 ? tema.tinta : tema.branco} position={[0, 0.14, 0]} />
          <Caixa args={[0.34, 0.14, 0.26]} raio={0.05} cor={i % 3 === 0 ? tema.tinta : tema.branco} position={[-0.04 * dir, 0.3, 0]} />
        </group>
      );
    })}
  </>
);

export const Cidade: React.FC<{
  tema: Tema;
  t: number;
  bcSobe?: number;
  sobe?: number; // 0..1: os prédios brotam do chão, do centro para fora
  bancosSobem?: [number, number];
  pulsoSeu?: number;
  pulsoB?: number;
  children?: React.ReactNode;
}> = ({tema, t, bcSobe = 1, sobe = 1, bancosSobem = [1, 1], pulsoSeu = 0, pulsoB = 0, children}) => {
  const predios = usePredios();
  return (
    <>
      {predios.map((q, i) => {
        const atraso = Math.min(0.6, q.dist / 24);
        const s = sobe >= 1 ? 1 : interpolate(sobe, [atraso, atraso + 0.4], [0, 1], {...clamp, easing: mola});
        if (s <= 0.001) return null;
        return <Caixa key={i} args={[q.w, q.h, q.d]} raio={0.07} cor={tema.branco} position={[q.p[0], (q.h * s) / 2, q.p[2]]} scale={[1, s, 1]} />;
      })}
      {/* Avenida: faixa central tracejada */}
      {Array.from({length: 18}).map((_, i) => (
        <mesh key={`f${i}`} position={[-13 + i * 1.5, 0.006, 4.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.05]} />
          <meshBasicMaterial color={tema.corpo} transparent opacity={0.45} />
        </mesh>
      ))}
      <Carros tema={tema} t={t} />
      <Banco tema={tema} pos={SEU} sobe={bancosSobem[0]} pulso={pulsoSeu} />
      <Banco tema={tema} pos={BANCO_B} sobe={bancosSobem[1]} pulso={pulsoB} />
      {bcSobe > 0.001 ? (
        <group position={BC} scale={[ESC_BC, ESC_BC * bcSobe, ESC_BC]}>
          <Predio tema={tema} pos={[0, 0, 0]} alt={10} escuro />
        </group>
      ) : null}
      {children}
    </>
  );
};

export const Envelope: React.FC<{tema: Tema; pos: V3; rotY?: number; giro?: number}> = ({tema, pos, rotY = 0, giro = 0}) => (
  <group position={pos} rotation={[giro * 0.4, rotY + giro, giro * 0.2]}>
    <Caixa args={[0.74, 0.06, 0.52]} raio={0.025} cor={tema.tinta} />
    <Caixa args={[0.66, 0.03, 0.44]} raio={0.012} cor={tema.branco} position={[0, 0.03, 0]} />
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <planeGeometry args={[0.2, 0.2]} />
      <meshBasicMaterial color={tema.acento} />
    </mesh>
  </group>
);
