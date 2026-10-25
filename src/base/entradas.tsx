// Entradas e saídas (v1.2): NADA surge do nada nem some do nada.
// Envolva o objeto em <Entra> com o tempo da palavra; ele entra de um jeito físico e (se quiser) sai em `sai`.
//
//   <Entra t={t} em={T.prato} modo="cai">        <Prato .../>   </Entra>   cai de cima com gravidade e quica
//   <Entra t={t} em={T.barra} modo="cresce">     <Barra .../>   </Entra>   cresce a partir de onde está apoiado
//   <Entra t={t} em={T.carta} modo="desliza" de="esquerda">  …   </Entra>   entra de fora do quadro
//   <Entra t={t} em={T.onda} modo="aparece">     <Rastro .../>  </Entra>   fade (para efeitos, luz, fantasma)
//   <Entra t={t} em={T.a} sai={T.b} modoSai="desliza" para="direita"> … </Entra>
//
// Escreva o objeto na posição FINAL; o <Entra> cuida do caminho até lá. A checagem automática sabe que ele tem transição.
// Boneco que chega numa cena: prefira `andar()` entrando pelo lado (é o mais natural). Use <Entra> só se ele já estiver lá
// desde o começo da cena (aí não precisa) ou se aparecer num corte de plano.
import React, {useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';
import {queda, mola as molaFisica} from './movimento';
import type {V3} from './pecas';

type Lado = 'esquerda' | 'direita' | 'cima' | 'baixo' | 'frente' | 'tras';
export type ModoEntra = 'cresce' | 'cai' | 'desliza' | 'aparece' | 'sobe';
const DIRECAO: Record<Lado, V3> = {esquerda: [-1, 0, 0], direita: [1, 0, 0], cima: [0, 1, 0], baixo: [0, -1, 0], frente: [0, 0, 1], tras: [0, 0, -1]};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const saiCubica = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

// guarda a opacidade original de cada material e aplica um fator (fade sem perder o valor de verdade)
const aplicarOpacidade = (g: THREE.Object3D, f: number) => {
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const u = mat.userData as {op0?: number; tr0?: boolean; dw0?: boolean};
      if (u.op0 === undefined) {
        u.op0 = mat.opacity;
        u.tr0 = mat.transparent;
        u.dw0 = mat.depthWrite;
      }
      const alvo = (u.op0 ?? 1) * f;
      const transp = f < 0.999 || Boolean(u.tr0);
      if (mat.transparent !== transp) {
        mat.transparent = transp;
        mat.needsUpdate = true;
      }
      mat.opacity = alvo;
      mat.depthWrite = f < 0.999 ? false : Boolean(u.dw0 ?? true);
    }
  });
};

type Estado = {visivel: boolean; escala: number; desloc: V3; opacidade: number};
const estadoEntrada = (modo: ModoEntra, tau: number, dur: number, distancia: number, de: Lado, altura: number): Estado => {
  const k = clamp01(tau / dur);
  if (tau < 0) return {visivel: false, escala: 1, desloc: [0, 0, 0], opacidade: 0};
  if (modo === 'cresce') {
    // cresce do apoio com uma mola física curta (passa um tiquinho e assenta), sem pop
    const s = molaFisica(tau, 0, {freq: 1.6 / dur, amort: 0.7});
    return {visivel: true, escala: Math.max(0.001, s), desloc: [0, 0, 0], opacidade: Math.min(1, k * 4)};
  }
  if (modo === 'cai') {
    const y = queda(tau, {ini: 0, de: [0, altura, 0], chaoY: 0, restituicao: 0.28}).pos[1];
    return {visivel: true, escala: 1, desloc: [0, y, 0], opacidade: 1};
  }
  if (modo === 'desliza' || modo === 'sobe') {
    const d = DIRECAO[modo === 'sobe' ? 'baixo' : de];
    const r = 1 - saiCubica(k);
    const dist = modo === 'sobe' ? Math.min(distancia, altura) : distancia;
    return {visivel: true, escala: 1, desloc: [d[0] * dist * r, d[1] * dist * r, d[2] * dist * r], opacidade: modo === 'sobe' ? Math.min(1, k * 3) : 1};
  }
  // aparece: fade com um leve crescimento (0,94 → 1)
  const e = saiCubica(k);
  return {visivel: true, escala: 0.94 + 0.06 * e, desloc: [0, 0, 0], opacidade: e};
};

export const Entra: React.FC<{
  t: number;
  em: number; // tempo da entrada (use T.xxx, nunca um número chutado)
  modo?: ModoEntra;
  dur?: number; // segundos (padrão: 0,5; a queda dura o tempo da física)
  de?: Lado; // de onde vem no `desliza`
  distancia?: number; // quanto anda no `desliza` (m); ponha o bastante para começar fora do quadro
  altura?: number; // de que altura cai no `cai` (m)
  sai?: number; // tempo da saída (opcional)
  modoSai?: 'aparece' | 'desliza' | 'encolhe';
  para?: Lado; // para onde vai no `desliza` da saída
  durSai?: number;
  children: React.ReactNode;
}> = ({t, em, modo = 'cresce', dur = 0.5, de = 'esquerda', distancia = 3, altura = 1.6, sai, modoSai = 'aparece', para = 'direita', durSai = 0.4, children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    let st = estadoEntrada(modo, t - em, dur, distancia, de, altura);
    if (sai !== undefined && t >= sai) {
      const k = clamp01((t - sai) / durSai);
      const e = saiCubica(k);
      if (k >= 1) st = {visivel: false, escala: 1, desloc: [0, 0, 0], opacidade: 0};
      else if (modoSai === 'desliza') {
        const d = DIRECAO[para];
        const a = e * e * distancia;
        st = {...st, desloc: [d[0] * a, d[1] * a, d[2] * a]};
      } else if (modoSai === 'encolhe') st = {...st, escala: Math.max(0.001, 1 - e)};
      else st = {...st, opacidade: st.opacidade * (1 - e)};
    }
    g.visible = st.visivel;
    if (!st.visivel) return;
    // pivô da escala = o ponto de apoio (embaixo, no centro) medido no próprio objeto
    g.position.set(0, 0, 0);
    g.scale.setScalar(1);
    g.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(g, true);
    if (!b.isEmpty() && g.parent) {
      const piv = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
      g.parent.worldToLocal(piv);
      const s = st.escala;
      g.scale.setScalar(s);
      g.position.set(piv.x * (1 - s) + st.desloc[0], piv.y * (1 - s) + st.desloc[1], piv.z * (1 - s) + st.desloc[2]);
    } else g.position.set(...st.desloc);
    aplicarOpacidade(g, st.opacidade);
  });
  return (
    <group ref={ref} userData={{transicao: true}}>
      {children}
    </group>
  );
};

// Fantasma: deixa o objeto translúcido (raio-X) para mostrar o que tem dentro/atrás. k 0 = normal, 1 = fantasma.
// Não briga com o que está atrás (não escreve profundidade) e a checagem não o trata como sólido.
export const Fantasma: React.FC<{k: number; opacidade?: number; children: React.ReactNode}> = ({k, opacidade = 0.22, children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (ref.current) aplicarOpacidade(ref.current, 1 - clamp01(k) * (1 - opacidade));
  });
  return (
    <group ref={ref} userData={k > 0.5 ? {qa: 'overlay', transicao: true} : {transicao: true}}>
      {children}
    </group>
  );
};

// Realce: acende o objeto na cor de acento (brilho suave que sobe e desce devagar; nunca pisca).
export const Realce: React.FC<{k: number; cor: string; forca?: number; children: React.ReactNode}> = ({k, cor, forca = 0.45, children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || Array.isArray(m) || !m.emissive) return;
      const u = m.userData as {em0?: THREE.Color; ei0?: number};
      if (!u.em0) {
        u.em0 = m.emissive.clone();
        u.ei0 = m.emissiveIntensity;
      }
      const kk = clamp01(k);
      m.emissive.copy(u.em0).lerp(new THREE.Color(cor), kk);
      m.emissiveIntensity = (u.ei0 ?? 0) + (forca - (u.ei0 ?? 0)) * kk;
    });
  });
  return <group ref={ref}>{children}</group>;
};
