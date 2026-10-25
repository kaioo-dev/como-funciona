// Peças de diagrama (v1.2): é assim que o vídeo EXPLICA. Pontos de energia, ondas, raios que rebatem, setas, cortes
// com hachura e brilhos suaves. Todas são efeitos (a checagem não as trata como sólidos) e nenhuma pisca.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {TEMA, CORES} from './ativo';
import {cacheLimitado, type V3} from './pecas';

// ---------- Pontos (muitas esferas, uma geometria só) ----------
// `pos(i)` devolve onde fica o ponto i (ou null para esconder). Cor "acesa" por padrão (brilha no bloom).
const geoPonto = new THREE.SphereGeometry(1, 12, 10);
export const Pontos: React.FC<{n: number; r: number; pos: (i: number) => V3 | null; cor?: THREE.Color | string; escala?: (i: number) => number}> = ({n, r, pos, cor = CORES.brilho, escala}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: cor, toneMapped: false}), [cor]);
  const m = new THREE.Object3D();
  const preparar = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    for (let i = 0; i < n; i++) {
      const p = pos(i);
      if (p) {
        m.position.set(...p);
        m.scale.setScalar(r * (escala ? Math.max(0, escala(i)) : 1));
      } else {
        m.position.set(0, -999, 0);
        m.scale.setScalar(0);
      }
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  };
  return <instancedMesh ref={preparar} args={[geoPonto, mat, n]} userData={{qa: 'overlay'}} frustumCulled={false} />;
};

// ---------- Caminhos ----------
export type Caminho = V3[] | ((s: number) => V3);
const comprimentos = (pts: V3[]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  return acc;
};
// ponto no caminho (s 0 → 1, pelo comprimento)
export const noCaminho = (c: Caminho): ((s: number) => V3) => {
  if (typeof c === 'function') return c;
  const acc = comprimentos(c);
  const total = acc[acc.length - 1] || 1;
  return (s: number) => {
    const d = Math.min(1, Math.max(0, s)) * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const a = c[i - 1];
    const b = c[i];
    const u = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  };
};

// Raio que rebate dentro de uma caixa (paredes de metal, espelhos): devolve os pontos de cada batida.
// `caixa` = {min, max} do espaço interno. Use com <Rastro caminho={rebater(...)} />.
export const rebater = (ini: V3, dir: V3, caixa: {min: V3; max: V3}, batidas = 6): V3[] => {
  const pts: V3[] = [ini];
  let p = new THREE.Vector3(...ini);
  const d = new THREE.Vector3(...dir).normalize();
  for (let b = 0; b < batidas; b++) {
    let tMin = Infinity;
    let eixo = -1;
    for (let i = 0; i < 3; i++) {
      const di = d.getComponent(i);
      if (Math.abs(di) < 1e-6) continue;
      const lim = di > 0 ? caixa.max[i] : caixa.min[i];
      const tt = (lim - p.getComponent(i)) / di;
      if (tt > 1e-5 && tt < tMin) {
        tMin = tt;
        eixo = i;
      }
    }
    if (eixo < 0) break;
    p = p.clone().addScaledVector(d, tMin);
    pts.push([p.x, p.y, p.z]);
    d.setComponent(eixo, -d.getComponent(eixo));
  }
  return pts;
};

// ---------- Rastro: pontos acesos correndo por um caminho ----------
// k = onde está a cabeça (0 → 1). `cauda` = quanto do caminho fica aceso atrás dela (1 = o caminho inteiro até a cabeça).
// `onda` faz os pontos ondularem (onda eletromagnética, som, sinal): amplitude em metros, número de ondas, velocidade.
// Entrada e saída suaves: os primeiros e os últimos pontos da cauda nascem pequenos (nada surge do nada).
export const Rastro: React.FC<{
  caminho: Caminho;
  k: number;
  t?: number;
  cauda?: number;
  n?: number;
  r?: number;
  onda?: {amp: number; ondas?: number; vel?: number; normal?: V3};
  cor?: THREE.Color | string;
  forca?: number; // 0..1 (some suave quando a energia acaba)
}> = ({caminho, k, t = 0, cauda = 0.35, n = 60, r = 0.02, onda, cor, forca = 1}) => {
  const f = noCaminho(caminho);
  if (forca <= 0.001 || k <= 0) return null;
  const normal = new THREE.Vector3(...(onda?.normal ?? [0, 1, 0]));
  return (
    <Pontos
      n={n}
      r={r}
      cor={cor}
      escala={(i) => {
        const u = i / Math.max(1, n - 1);
        const s = k - u * cauda;
        if (s < 0 || s > 1) return 0;
        // cabeça cheia, cauda afinando; nasce e some suave nas pontas do caminho
        return forca * (1 - 0.65 * u) * Math.min(1, s * 25) * Math.min(1, (1 - s) * 25 + (k >= 1 ? 1 : 0));
      }}
      pos={(i) => {
        const u = i / Math.max(1, n - 1);
        const s = k - u * cauda;
        if (s < 0 || s > 1) return null;
        const p = f(s);
        if (!onda) return p;
        const q = f(Math.min(1, s + 0.002));
        const tg = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize();
        const lado = new THREE.Vector3().crossVectors(tg, normal);
        const perp = lado.lengthSq() > 1e-6 ? new THREE.Vector3().crossVectors(lado.normalize(), tg).normalize() : normal.clone();
        const a = onda.amp * forca * Math.sin(2 * Math.PI * (onda.ondas ?? 6) * s - t * (onda.vel ?? 8));
        return [p[0] + perp.x * a, p[1] + perp.y * a, p[2] + perp.z * a];
      }}
    />
  );
};

// ---------- Seta 3D ----------
// Cresce do começo para a ponta conforme k (0 → 1). Geometria fixa: só muda escala e direção (barato na GPU).
const geoHaste = new THREE.CylinderGeometry(1, 1, 1, 16);
const geoPonta = new THREE.ConeGeometry(1, 1, 24);
export const Seta3D: React.FC<{de: V3; para: V3; k?: number; grossura?: number; cor?: string; brilho?: number}> = ({de, para, k = 1, grossura = 0.03, cor = TEMA.acento, brilho = 0.35}) => {
  const kk = Math.min(1, Math.max(0, k));
  if (kk <= 0.001) return null;
  const a = new THREE.Vector3(...de);
  const b = new THREE.Vector3(...para);
  const dir = b.clone().sub(a);
  const L = dir.length() * kk;
  dir.normalize();
  const ponta = Math.min(L * 0.45, grossura * 5);
  const haste = Math.max(0.0001, L - ponta);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mat = <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={brilho} roughness={0.5} />;
  return (
    <group position={de} quaternion={q} userData={{qa: 'overlay'}}>
      <mesh geometry={geoHaste} position={[0, haste / 2, 0]} scale={[grossura, haste, grossura]}>
        {mat}
      </mesh>
      <mesh geometry={geoPonta} position={[0, haste + ponta / 2, 0]} scale={[grossura * 2.4, ponta, grossura * 2.4]}>
        {mat}
      </mesh>
    </group>
  );
};

// ---------- Hachura (face cortada) ----------
// Plano com listras diagonais: ponha na face onde o objeto foi "serrado" para mostrar que é um corte.
// Não briga com a face de baixo (polygonOffset). Use com <Corte> ou sozinho.
const cacheHach = new Map<string, THREE.CanvasTexture>();
const texHachura = (fundo: string, risco: string) => {
  const k = fundo + risco;
  let tx = cacheHach.get(k);
  if (!tx) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    g.fillStyle = fundo;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = risco;
    g.lineWidth = 6;
    for (let i = -256; i < 512; i += 40) {
      g.beginPath();
      g.moveTo(i, 256);
      g.lineTo(i + 256, 0);
      g.stroke();
    }
    tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    cacheHach.set(k, tx);
  }
  return tx;
};
const geoPlano = new THREE.PlaneGeometry(1, 1);
const cacheHach2 = cacheLimitado<THREE.Texture>(64);
export const Hachura: React.FC<{larg: number; alt: number; pos: V3; rot?: V3; fundo?: string; risco?: string; densidade?: number}> = ({
  larg,
  alt,
  pos,
  rot = [0, 0, 0],
  fundo = CORES.escuro,
  risco = CORES.medio, // listra sutil: o corte se lê, mas não vira textura pesada
  densidade = 6,
}) => {
  const base = texHachura(fundo, risco);
  // uma textura por tamanho (arredondado), com limite: um corte que muda de tamanho a cada quadro não enche a memória
  const rx = Math.max(0.5, Math.round(larg * densidade * 2) / 2);
  const ry = Math.max(0.5, Math.round(alt * densidade * 2) / 2);
  const tx = cacheHach2(`${fundo}${risco}|${rx}|${ry}`, () => {
    const c = base.clone();
    c.repeat.set(rx, ry);
    c.needsUpdate = true;
    return c;
  });
  return (
    <mesh geometry={geoPlano} position={pos} rotation={rot} scale={[larg, alt, 1]} userData={{qa: 'overlay'}}>
      <meshStandardMaterial map={tx} roughness={0.9} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  );
};

// ---------- Brilho (faísca, contato, energia) ----------
// Esfera acesa com halo. k 0..1 controla o tamanho; para pulsar use um seno LENTO (≤ 2 vezes por segundo).
export const Brilho: React.FC<{pos: V3; k: number; r?: number; cor?: THREE.Color | string}> = ({pos, k, r = 0.06, cor = CORES.brilho}) => {
  if (k <= 0.001) return null;
  return (
    <group position={pos} userData={{qa: 'overlay'}}>
      <mesh geometry={geoPonto} scale={r * k}>
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      <mesh geometry={geoPonto} scale={r * k * 2.4}>
        <meshBasicMaterial color={cor} toneMapped={false} transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ---------- Fio que acende (esquema elétrico, cano, cabo) ----------
// Liga a → b por uma barra fina; `aceso` 0..1 vira acento brilhante. Geometria fixa.
const geoFio = new THREE.BoxGeometry(1, 1, 1);
export const Fio: React.FC<{a: V3; b: V3; aceso?: number; grossura?: number; cor?: string}> = ({a, b, aceso = 0, grossura = 0.05, cor = CORES.cinza}) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
  const c = va.add(vb).multiplyScalar(0.5);
  const on = Math.min(1, Math.max(0, aceso));
  const corFinal = '#' + new THREE.Color(cor).lerp(new THREE.Color(TEMA.acento), on).getHexString();
  return (
    <mesh geometry={geoFio} position={[c.x, c.y, c.z]} quaternion={q} scale={[L + grossura, grossura, grossura]} userData={{qa: 'overlay'}}>
      <meshStandardMaterial color={corFinal} emissive={TEMA.acento} emissiveIntensity={on * 1.4} roughness={0.5} />
    </mesh>
  );
};
