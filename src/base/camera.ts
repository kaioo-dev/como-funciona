// Câmera de cinema do kit (v1.2).
// Regra de ouro: NUNCA escreva a posição da câmera na mão. Diga O QUE precisa aparecer (`alvos`) e DE ONDE olhar (`de`);
// a câmera calcula a distância para tudo caber na área livre do Reels (entre a pílula e a legenda), já contando o
// push-in e o arco da cena inteira. Assim o boneco nunca sai cortado e o assunto nunca fica atrás da legenda.
import * as THREE from 'three';
import {cinematizar, projetar, type Cam, type Foco, type V3} from './pecas';

export const W = 1080;
export const H = 1920;
// Onde o assunto 3D deve caber (pixels de 1080×1920): abaixo da linha de chips/carimbo e acima da legenda.
export const AREA = {topo: 540, base: 1330, esq: 90, dir: 990};
export type Area = typeof AREA;

export type Movimento = {
  empurra?: number; // push-in ao longo da cena (0,16 padrão; 0,25 revelação; 0,06 esquema)
  arco?: number; // giro lateral em volta do assunto (rad ao longo da cena)
  sentido?: 1 | -1; // alterne entre cenas seguidas
  grua?: number; // sobe (+) ou desce (−) ao longo da cena
  mao?: number; // câmera na mão (0 = travada; 1 padrão; 1,5 tensão)
  lente?: number; // < 1 = lente longa (fundo comprimido, mais desfoque)
};

// Plano de cinema: lente longa, push-in contínuo, arco lateral, grua e respiração de câmera na mão.
// `k` = progresso da cena (0 → 1), `t` = tempo do vídeo.
export const plano = (c: Cam, k: number, t: number, {empurra = 0.16, arco = 0.26, sentido = 1, grua = 0.07, mao = 1, lente = 0.62}: Movimento = {}): Cam => {
  const b = cinematizar(c, k, {lente, arco, sentido, grua});
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const f = 1 - empurra * e;
  const v: V3 = [b.pos[0] - b.alvo[0], b.pos[1] - b.alvo[1], b.pos[2] - b.alvo[2]];
  const d = Math.hypot(v[0], v[1], v[2]) * f;
  const a = 0.0035 * d * mao;
  const r = (w: number, fase: number) => Math.sin(t * w + fase) + 0.5 * Math.sin(t * w * 2.3 + fase * 1.7);
  return {
    ...b,
    pos: [b.alvo[0] + v[0] * f + r(0.9, 0.3) * a, b.alvo[1] + v[1] * f + r(0.7, 1.1) * a * 0.7, b.alvo[2] + v[2] * f + r(0.8, 2.0) * a * 0.5],
    alvo: [b.alvo[0] + r(0.6, 2.4) * a * 0.4, b.alvo[1] + r(0.5, 0.9) * a * 0.3, b.alvo[2]],
  };
};

// afasta (f > 1) ou aproxima (f < 1) a câmera do alvo
export const longe = (c: Cam, f: number): Cam => ({...c, pos: [c.alvo[0] + (c.pos[0] - c.alvo[0]) * f, c.alvo[1] + (c.pos[1] - c.alvo[1]) * f, c.alvo[2] + (c.pos[2] - c.alvo[2]) * f]});
// mistura duas câmeras (k 0 → 1): para ir de um enquadramento a outro dentro da mesma cena
export const misturar = (a: Cam, b: Cam, k: number): Cam => {
  const l = (x: number, y: number) => x + (y - x) * k;
  return {
    pos: [l(a.pos[0], b.pos[0]), l(a.pos[1], b.pos[1]), l(a.pos[2], b.pos[2])],
    alvo: [l(a.alvo[0], b.alvo[0]), l(a.alvo[1], b.alvo[1]), l(a.alvo[2], b.alvo[2])],
    fov: l(a.fov, b.fov),
    sobe: l(a.sobe ?? 0, b.sobe ?? 0),
    alvos: k < 0.5 ? a.alvos : b.alvos,
    ombro: k < 0.5 ? a.ombro : b.ombro,
  };
};

export const pj = (p: V3, cam: Cam) => projetar(p, cam, W, H);
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Os 8 cantos de uma caixa (mesmos `pos` e `args` da <Caixa>): passe como alvos para enquadrar o objeto inteiro.
export const cantos = (pos: V3, args: V3): V3[] => {
  const out: V3[] = [];
  for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) out.push([pos[0] + args[0] * sx, pos[1] + args[1] * sy, pos[2] + args[2] * sz]);
  return out;
};
// O boneco inteiro em pé (dos pés à cabeça), para enquadrar uma pessoa: cantos(...pessoa(pos))
export const pessoa = (pos: V3, escala = 1): V3[] => cantos([pos[0], pos[1] + 0.98 * escala, pos[2]], [0.6 * escala, 1.96 * escala, 0.45 * escala]);
// Só do peito para cima (plano médio de uma pessoa)
export const busto = (pos: V3, escala = 1): V3[] => cantos([pos[0], pos[1] + 1.55 * escala, pos[2]], [0.6 * escala, 0.8 * escala, 0.4 * escala]);
export const centro = (pts: V3[]): V3 => {
  const mn = [Infinity, Infinity, Infinity];
  const mx = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let i = 0; i < 3; i++) {
    mn[i] = Math.min(mn[i], p[i]);
    mx[i] = Math.max(mx[i], p[i]);
  }
  return [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
};
const tamanho = (pts: V3[]) => {
  const c = centro(pts);
  return Math.max(0.05, ...pts.map((p) => dist(p, c)));
};

const cabe = (cam: Cam, pts: V3[], area: Area) => {
  const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.01, 1000);
  c.position.set(...cam.pos);
  c.lookAt(...cam.alvo);
  if (cam.sobe) c.setViewOffset(W, H, 0, cam.sobe, W, H);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3();
  for (const p of pts) {
    v.set(...p).applyMatrix4(c.matrixWorldInverse);
    if (v.z > -0.01) return false; // atrás da câmera
    v.set(...p).project(c);
    const x = ((v.x + 1) / 2) * W;
    const y = ((1 - v.y) / 2) * H;
    if (x < area.esq || x > area.dir || y < area.topo || y > area.base) return false;
  }
  return true;
};

export type Enquadre = Movimento & {
  alvos: V3[]; // o que precisa aparecer inteiro (use cantos(), pessoa(), busto() ou pontos soltos)
  de?: [number, number]; // de onde olhar: [azimute°, elevação°]. 0° = de frente (+z), 90° = da direita (+x); elevação 0 = na altura, 90 = de cima
  fov?: number;
  area?: Area;
  folga?: number; // 1,0 = encosta na borda da área; 1,08 padrão
  mira?: V3; // ponto para onde a câmera olha (padrão: centro dos alvos)
};

// Câmera que enquadra os `alvos` dentro da AREA em TODA a cena (início, meio e fim do movimento).
// Uso: const cam = camera(k, t, {alvos: cantos(MICRO.pos, MICRO.args), de: [35, 18], empurra: 0.2});
export const camera = (k: number, t: number, op: Enquadre): Cam => {
  const {alvos, de = [30, 15], fov = 30, area = AREA, folga = 1.08, mira} = op;
  const alvo = mira ?? centro(alvos);
  const az = (de[0] * Math.PI) / 180;
  const el = (Math.min(89, Math.max(-60, de[1])) * Math.PI) / 180;
  const dir: V3 = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  const sobe = H / 2 - (area.topo + area.base) / 2;
  const base = (d: number): Cam => ({pos: [alvo[0] + dir[0] * d, alvo[1] + dir[1] * d, alvo[2] + dir[2] * d], alvo, fov, sobe});
  const ok = (d: number) => [0, 0.5, 1].every((kk) => cabe(plano(base(d), kk, 0, {...op, mao: 0}), alvos, area));
  const s = tamanho(alvos);
  let lo = s * 0.3;
  let hi = s * 400;
  if (!ok(hi)) hi = s * 2000;
  for (let i = 0; i < 40; i++) {
    const m = Math.sqrt(lo * hi);
    if (ok(m)) hi = m;
    else lo = m;
  }
  const cam = plano(base(hi * folga), k, t, op);
  return {...cam, alvos};
};

// Plano por cima do ombro: a câmera fica atrás e ao lado da cabeça do boneco, olhando os `alvos`.
// O ombro e a cabeça entram desfocados no canto (de propósito). `lado` 1 = ombro direito dele, −1 = esquerdo.
export const sobreOmbro = (
  k: number,
  t: number,
  {boneco, alvos, lado = 1, fov = 28, ...mov}: Movimento & {boneco: {pos: V3; rotY?: number; escala?: number}; alvos: V3[]; lado?: 1 | -1; fov?: number},
): Cam => {
  const e = boneco.escala ?? 1;
  const ry = boneco.rotY ?? 0;
  const lat: V3 = [Math.cos(ry) * lado, 0, -Math.sin(ry) * lado]; // para o lado do ombro escolhido
  const ombro: V3 = [boneco.pos[0] + lat[0] * 0.25 * e, boneco.pos[1] + 1.62 * e, boneco.pos[2] + lat[2] * 0.25 * e];
  const c = centro(alvos);
  const v = new THREE.Vector3(c[0] - ombro[0], c[1] - ombro[1], c[2] - ombro[2]).normalize();
  const mv: Movimento = {arco: 0.06, empurra: 0.08, grua: 0.02, lente: 1, ...mov};
  // recua atrás do ombro até os alvos caberem na área (do começo ao fim do movimento)
  // quanto mais longe, mais de lado: o ombro fica no canto do quadro e não no meio
  // o ombro fica no CANTO do quadro (deslocado de lado e um pouco acima), nunca no meio tapando o assunto
  const em = (d: number): Cam => ({pos: [ombro[0] - v.x * d * e + lat[0] * (0.6 + 0.3 * d) * e, ombro[1] + 0.3 * e - v.y * d * e, ombro[2] - v.z * d * e + lat[2] * (0.6 + 0.3 * d) * e], alvo: c, fov});
  let lo = 0.6;
  let hi = 60;
  const ok = (d: number) => [0, 0.5, 1].every((kk) => cabe(plano(em(d), kk, 0, {...mv, mao: 0}), alvos, AREA));
  if (ok(lo)) hi = lo;
  else
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (ok(m)) hi = m;
      else lo = m;
    }
  const cam = plano(em(Math.max(hi * 1.1, 2.2)), k, t, mv); // longe o bastante para o ombro não tomar o quadro
  return {...cam, alvos, ombro: true};
};

// Foco no ponto `p` (o assunto da frase). `faixa` em metros: 1,2 close · 2,2 objeto na bancada · 3–4 esquema.
// Desfoque LEVE por padrão (o fundo só fica um pouco suave; desfoque forte deixa a imagem "sufocada").
export const focar = (cam: Cam, p: V3, faixa: number, bokeh = 3): Foco => ({dist: dist(cam.pos, p), faixa: faixa * 1.2, bokeh: bokeh * 0.6});
// Foco puxado (rack focus): passa de `a` para `b` ao longo de k (0 → 1), na palavra que muda o assunto.
export const focoPuxado = (cam: Cam, a: V3, b: V3, k: number, faixa: number, bokeh = 3): Foco => {
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  return {dist: dist(cam.pos, a) + (dist(cam.pos, b) - dist(cam.pos, a)) * e, faixa: faixa * 1.2, bokeh: bokeh * 0.6};
};
// Foco automático no centro dos alvos da câmera, com a faixa do tamanho deles.
export const focoAuto = (cam: Cam, bokeh = 3): Foco => {
  const pts = cam.alvos ?? [cam.alvo];
  return focar(cam, centro(pts), Math.max(0.6, tamanho(pts) * 2.4), bokeh);
};
