// Materiais do kit (v1.1): textura de verdade em vez de cor chapada.
// As texturas são desenhadas em canvas (ruído, fibra, veio, trama), uma vez só, e reaproveitadas por todas as peças.
// Elas variam a rugosidade e o relevo da superfície; a COR continua vindo do tema (regra do kit).
import React from 'react';
import * as THREE from 'three';

export type TipoMaterial =
  | 'fosco' // plástico acetinado (padrão de todas as peças)
  | 'plastico' // plástico brilhante, injetado
  | 'borracha'
  | 'metal' // metal escovado
  | 'cromado'
  | 'vidro'
  | 'papel' // papel, papelão, cartão
  | 'madeira'
  | 'tecido'
  | 'ceramica'
  | 'pele'; // boneco "de vinil" (pele lisa, quase sem brilho)

// ---------- Ruído determinístico (o mesmo em todo render) ----------
const hash = (x: number, y: number, s: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
};
const ruido = (x: number, y: number, s: number, per: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const m = (a: number) => ((a % per) + per) % per; // repete sem emenda
  const a = hash(m(xi), m(yi), s);
  const b = hash(m(xi + 1), m(yi), s);
  const c = hash(m(xi), m(yi + 1), s);
  const d = hash(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, s: number, per: number, oit = 4) => {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oit; i++) {
    v += amp * ruido(x * f, y * f, s + i * 13, Math.max(1, Math.round(per * f)));
    amp *= 0.5;
    f *= 2;
  }
  return v;
};

type Mapas = {rug: THREE.Texture; relevo: THREE.Texture; cor?: THREE.Texture};
const cache = new Map<TipoMaterial, Mapas>();

const textura = (desenha: (x: number, y: number) => number, tam = 256, cor = false) => {
  const cv = document.createElement('canvas');
  cv.width = tam;
  cv.height = tam;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(tam, tam);
  for (let y = 0; y < tam; y++)
    for (let x = 0; x < tam; x++) {
      const v = Math.max(0, Math.min(255, Math.round(desenha(x / tam, y / tam) * 255)));
      const i = (y * tam + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// Cada tipo: [rugosidade (0 liso..1 áspero), relevo, cor opcional (multiplica a cor do tema)]
const RECEITAS: Record<TipoMaterial, () => Mapas> = {
  fosco: () => ({
    rug: textura((x, y) => 0.55 + 0.25 * fbm(x * 8, y * 8, 1, 8)),
    relevo: textura((x, y) => 0.5 + 0.5 * (fbm(x * 48, y * 48, 2, 48, 2) - 0.5)),
  }),
  plastico: () => ({
    rug: textura((x, y) => 0.22 + 0.18 * fbm(x * 6, y * 6, 3, 6)),
    relevo: textura((x, y) => 0.5 + 0.3 * (fbm(x * 64, y * 64, 4, 64, 2) - 0.5)),
  }),
  borracha: () => ({
    rug: textura((x, y) => 0.8 + 0.15 * fbm(x * 10, y * 10, 5, 10)),
    relevo: textura((x, y) => fbm(x * 96, y * 96, 6, 96, 3)),
  }),
  metal: () => ({
    // escovado: ruído esticado numa direção
    rug: textura((x, y) => 0.28 + 0.3 * fbm(x * 2, y * 160, 7, 2, 3)),
    relevo: textura((x, y) => 0.5 + 0.5 * (fbm(x * 2, y * 220, 8, 2, 2) - 0.5)),
  }),
  cromado: () => ({
    rug: textura((x, y) => 0.06 + 0.06 * fbm(x * 6, y * 6, 9, 6)),
    relevo: textura(() => 0.5, 8),
  }),
  vidro: () => ({
    rug: textura((x, y) => 0.04 + 0.05 * fbm(x * 4, y * 4, 10, 4)),
    relevo: textura(() => 0.5, 8),
  }),
  papel: () => ({
    rug: textura((x, y) => 0.85 + 0.1 * fbm(x * 30, y * 30, 11, 30)),
    // fibras: traços curtos em várias direções
    relevo: textura((x, y) => 0.5 + 0.6 * (fbm(x * 120, y * 40, 12, 120, 2) - 0.5) + 0.4 * (fbm(x * 40, y * 120, 13, 40, 2) - 0.5)),
    cor: textura((x, y) => 0.93 + 0.07 * fbm(x * 12, y * 12, 14, 12), 256, true),
  }),
  madeira: () => {
    // veio: anéis deformados por ruído
    const veio = (x: number, y: number) => {
      const d = y * 18 + 2.2 * fbm(x * 3, y * 3, 15, 3);
      return 0.5 + 0.5 * Math.sin(d * Math.PI * 2);
    };
    return {
      rug: textura((x, y) => 0.55 + 0.25 * veio(x, y)),
      relevo: textura((x, y) => 0.4 + 0.4 * veio(x, y) + 0.2 * fbm(x * 80, y * 8, 16, 80, 2)),
      cor: textura((x, y) => 0.72 + 0.28 * Math.pow(veio(x, y), 1.6), 512, true),
    };
  },
  tecido: () => {
    const trama = (x: number, y: number) => {
      const a = Math.sin(x * Math.PI * 2 * 64);
      const b = Math.sin(y * Math.PI * 2 * 64);
      return 0.5 + 0.25 * (a > 0 ? b : -b) + 0.15 * (fbm(x * 32, y * 32, 17, 32, 2) - 0.5);
    };
    return {rug: textura((x, y) => 0.85 + 0.1 * trama(x, y)), relevo: textura(trama), cor: textura((x, y) => 0.88 + 0.12 * trama(x, y), 256, true)};
  },
  ceramica: () => ({
    rug: textura((x, y) => 0.12 + 0.1 * fbm(x * 5, y * 5, 18, 5)),
    relevo: textura((x, y) => 0.5 + 0.2 * (fbm(x * 20, y * 20, 19, 20, 3) - 0.5)),
  }),
  pele: () => ({
    rug: textura((x, y) => 0.5 + 0.2 * fbm(x * 12, y * 12, 20, 12)),
    relevo: textura((x, y) => 0.5 + 0.35 * (fbm(x * 110, y * 110, 21, 110, 2) - 0.5)),
  }),
};

export const mapas = (tipo: TipoMaterial): Mapas => {
  let m = cache.get(tipo);
  if (!m) {
    m = RECEITAS[tipo]();
    cache.set(tipo, m);
  }
  return m;
};

// Texturas com repetição diferente da padrão (cache por tipo + escala).
const cacheEscala = new Map<string, THREE.Texture>();
const repetida = (t: THREE.Texture | undefined, chave: string, escala: number) => {
  if (!t || escala === 1) return t;
  const k = `${chave}|${escala}`;
  let c = cacheEscala.get(k);
  if (!c) {
    c = t.clone();
    c.repeat.set(escala, escala);
    c.needsUpdate = true;
    cacheEscala.set(k, c);
  }
  return c;
};

// Propriedades físicas de cada tipo (MeshPhysicalMaterial).
const FISICA: Record<TipoMaterial, Partial<THREE.MeshPhysicalMaterialParameters> & {relevo: number}> = {
  fosco: {roughness: 1, metalness: 0, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: 0.55, relevo: 0.25},
  plastico: {roughness: 1, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.9, relevo: 0.15},
  borracha: {roughness: 1, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, envMapIntensity: 0.35, relevo: 0.6},
  metal: {roughness: 1, metalness: 1, envMapIntensity: 1.1, relevo: 0.25},
  cromado: {roughness: 1, metalness: 1, envMapIntensity: 1.4, relevo: 0},
  vidro: {roughness: 1, metalness: 0, transmission: 0.92, thickness: 0.4, ior: 1.5, envMapIntensity: 1.2, relevo: 0},
  papel: {roughness: 1, metalness: 0, sheen: 0.25, sheenRoughness: 0.9, envMapIntensity: 0.4, relevo: 0.5},
  madeira: {roughness: 1, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.5, relevo: 0.4},
  tecido: {roughness: 1, metalness: 0, sheen: 0.8, sheenRoughness: 0.6, envMapIntensity: 0.35, relevo: 0.7},
  ceramica: {roughness: 1, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.9, relevo: 0.1},
  pele: {roughness: 1, metalness: 0, sheen: 0.35, sheenRoughness: 0.7, clearcoat: 0.04, envMapIntensity: 0.5, relevo: 0.2},
};

// <Material tipo="madeira" cor={tema.areia} />  — use dentro de qualquer <mesh>.
// `escala` repete a textura (aumente em objetos grandes para o grão não ficar gigante).
export const Material: React.FC<{tipo?: TipoMaterial; cor: string; emissivo?: number; escala?: number; opacidade?: number}> = ({
  tipo = 'fosco',
  cor,
  emissivo = 0,
  escala = 1,
  opacidade = 1,
}) => {
  const m = mapas(tipo);
  const {relevo, ...f} = FISICA[tipo];
  return (
    <meshPhysicalMaterial
      {...f}
      color={cor}
      roughnessMap={repetida(m.rug, `${tipo}r`, escala)}
      bumpMap={relevo > 0 ? repetida(m.relevo, `${tipo}b`, escala) : undefined}
      bumpScale={relevo}
      map={repetida(m.cor, `${tipo}c`, escala)}
      emissive={cor}
      emissiveIntensity={emissivo}
      transparent={opacidade < 1 || tipo === 'vidro'}
      opacity={opacidade}
      sheenColor={f.sheen ? cor : undefined}
    />
  );
};
