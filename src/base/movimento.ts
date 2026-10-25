// Física de movimento do kit (v1.1).
// Tudo aqui é função pura do tempo: o mesmo quadro sempre dá a mesma posição (o Remotion renderiza quadros fora de ordem).
//
// Regras que estas funções garantem, e que a cena NÃO deve refazer na mão:
// - o pé que está no chão não desliza (a fase do passo vem da distância andada, não do relógio);
// - o boneco pisa na altura certa (chão, plataforma, degrau) e passa por cima de vãos pequenos;
// - pulo e queda seguem gravidade de verdade, com agachada antes e amortecimento ao pousar;
// - dois bonecos nunca ocupam o mesmo lugar (`separar`).
import type {Pose, V3} from './pecas';

export const G = 9.8; // gravidade (m/s²); 1 unidade da cena = 1 metro (o Boneco tem 1,95)

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const suaviza = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

// ---------- Superfícies (onde dá para pisar) ----------
// Uma superfície é o TOPO de uma caixa: retângulo em x/z na altura y.
// Monte com `topo()` a partir da mesma posição/medida que você passa para a <Caixa>, assim os dois nunca discordam.
export type Superficie = {x0: number; x1: number; z0: number; z1: number; y: number};
export const topo = (pos: V3, args: V3): Superficie => ({
  x0: pos[0] - args[0] / 2,
  x1: pos[0] + args[0] / 2,
  z0: pos[2] - args[2] / 2,
  z1: pos[2] + args[2] / 2,
  y: pos[1] + args[1] / 2,
});
// Altura do chão em (x, z): a superfície mais alta que contém o ponto; fora de todas, o chão (y = 0).
export const alturaChao = (x: number, z: number, sup: Superficie[] = [], chao = 0) => {
  let h = chao;
  for (const s of sup) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 && s.y > h) h = s.y;
  return h;
};

// ---------- Caminho ----------
// Pontos por onde o boneco passa (o y é ignorado; quem decide a altura é o chão).
// As quinas são arredondadas, para ele virar em curva e não girar no lugar.
type Amostra = {s: number; p: V3};
const cacheCaminho = new Map<string, Amostra[]>();
const catmull = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const amostrar = (pts: V3[]): Amostra[] => {
  const k = JSON.stringify(pts);
  const c = cacheCaminho.get(k);
  if (c) return c;
  const out: Amostra[] = [];
  let s = 0;
  let ant: V3 | null = null;
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[i];
    const cc = pts[i + 1];
    const d = pts[Math.min(n - 1, i + 2)];
    for (let j = 0; j < 40; j++) {
      const u = j / 40;
      const p: V3 = [catmull(a[0], b[0], cc[0], d[0], u), 0, catmull(a[2], b[2], cc[2], d[2], u)];
      if (ant) s += Math.hypot(p[0] - ant[0], p[2] - ant[2]);
      out.push({s, p});
      ant = p;
    }
  }
  const last = pts[n - 1];
  if (ant) s += Math.hypot(last[0] - ant[0], last[2] - ant[2]);
  out.push({s, p: [last[0], 0, last[2]]});
  cacheCaminho.set(k, out);
  return out;
};
export const comprimento = (pts: V3[]) => {
  const a = amostrar(pts);
  return a[a.length - 1].s;
};
// Ponto e direção (ângulo Y) a uma distância s do início do caminho.
export const noCaminho = (pts: V3[], s: number) => {
  const a = amostrar(pts);
  const L = a[a.length - 1].s;
  const sc = Math.min(L, Math.max(0, s));
  let lo = 0;
  let hi = a.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (a[m].s <= sc) lo = m;
    else hi = m;
  }
  const A = a[lo];
  const B = a[hi];
  const k = B.s > A.s ? (sc - A.s) / (B.s - A.s) : 0;
  const p: V3 = [lerp(A.p[0], B.p[0], k), 0, lerp(A.p[2], B.p[2], k)];
  // direção olhando um pouco à frente (curva suave)
  const f = a[Math.min(a.length - 1, hi + 3)];
  const tr = a[Math.max(0, lo - 3)];
  const rotY = Math.atan2(f.p[0] - tr.p[0], f.p[2] - tr.p[2]);
  return {p, rotY};
};

// ---------- Andar ----------
export type Andar = {
  caminho: V3[]; // pontos (x, ?, z)
  ini: number; // segundo em que começa a andar
  fim?: number; // segundo em que chega (se omitido, usa a velocidade)
  velocidade?: number; // m/s (1,2 = andar normal; 2,6 = correr)
  passada?: number; // tamanho de UM passo (m). Padrão: 0,62 andando, 1,0 correndo
  chao?: Superficie[]; // plataformas por onde ele passa
  escala?: number; // mesma escala passada ao <Boneco>
  rotFinal?: number; // para onde ele olha depois de parar (rad); padrão: a direção da chegada
};
// Um pé num instante: posição à frente do corpo (z), quanto está erguido, inclinação da ponta,
// se está apoiado e a altura do chão embaixo dele (relativa aos pés do boneco).
export type Pe = {z: number; ergue: number; ponta: number; noChao: boolean; base: number};

// Perfil de velocidade com aceleração e frenagem (0,35 s cada): ninguém sai andando a 100% nem para de estalo.
const ACEL = 0.35;
const distancia = (t: number, ini: number, dur: number, L: number) => {
  const tau = t - ini;
  if (tau <= 0) return 0;
  if (tau >= dur) return L;
  const a = Math.min(ACEL, dur / 2);
  const v = L / (dur - a); // velocidade de cruzeiro que fecha a conta
  if (tau < a) return (v * tau * tau) / (2 * a);
  if (tau > dur - a) {
    const r = dur - tau;
    return L - (v * r * r) / (2 * a);
  }
  return v * (tau - a / 2);
};

const frac = (x: number) => x - Math.floor(x);
// Ciclo do passo. `fase` conta ciclos (1 ciclo = 2 passos). O pé de apoio anda para trás
// exatamente na mesma distância que o corpo anda para a frente: por isso ele não desliza.
export const pePasso = (fase: number, l: 1 | -1, passada: number, correndo = false) => {
  const apoio = correndo ? 0.38 : 0.62; // fração do ciclo com o pé no chão
  const D = 2 * passada;
  const f = frac(fase + (l > 0 ? 0 : 0.5));
  const meia = (D * apoio) / 2;
  if (f < apoio) {
    const u = f / apoio;
    return {z: meia - D * apoio * u, ergue: 0, ponta: 0, noChao: true, u, apoio, meia, D};
  }
  const u = (f - apoio) / (1 - apoio);
  const k = u * u * (3 - 2 * u);
  return {
    z: -meia + 2 * meia * k,
    ergue: (correndo ? 0.2 : 0.1) * Math.sin(Math.PI * u),
    ponta: 0.35 * Math.sin(Math.PI * u) - 0.15 * Math.sin(Math.PI * Math.min(1, u * 2)),
    noChao: false,
    u,
    apoio,
    meia,
    D,
  };
};

// Devolve tudo que o <Boneco> precisa: posição, rotação e a pose com os dois pés já resolvidos
// (cada pé pisa na altura do chão que está embaixo DELE: degrau, plataforma, vão).
export const andar = (t: number, c: Andar) => {
  const esc = c.escala ?? 1;
  const Ltotal = comprimento(c.caminho);
  const v0 = c.velocidade ?? 1.2;
  const dur = c.fim !== undefined ? Math.max(0.3, c.fim - c.ini) : Ltotal / v0 + ACEL;
  const correndo = Ltotal / dur > 2;
  const passada = (c.passada ?? (correndo ? 1.0 : 0.62)) * esc;
  const D = 2 * passada;
  const apoio = correndo ? 0.38 : 0.62;
  const inicio = apoio / 2; // começa com os dois pés quase juntos embaixo do corpo
  const LADO = 0.105 * esc;

  // Ao parar, o pé da frente fica plantado e o corpo termina o último meio passo por cima dele.
  // Para chegar exatamente no fim do caminho, a marcha para um pouco antes (em L).
  const pePlantado = (fase: number) => {
    const cand = ([1, -1] as const).map((l) => ({l, p: pePasso(fase, l, passada, correndo)})).filter((x) => x.p.noChao);
    if (cand.length === 0) return {l: 1 as const, z: 0};
    cand.sort((a, b) => b.p.z - a.p.z);
    return {l: cand[0].l, z: Math.max(0, cand[0].p.z)};
  };
  let L = Ltotal;
  for (let i = 0; i < 4; i++) L = Math.max(0, Ltotal - pePlantado(L / D + inicio).z);
  const zFinal = Ltotal - L;

  const sMarcha = distancia(t, c.ini, dur, L);
  const ds = distancia(t + 1 / 30, c.ini, dur, L) - sMarcha;
  const vCruzeiro = L / Math.max(0.3, dur - Math.min(ACEL, dur / 2));
  const intensidade = Math.min(1, Math.max(0, (ds * 30) / Math.max(0.01, vCruzeiro)));
  const fase = sMarcha / D + inicio;
  const parado = Math.max(0, t - (c.ini + dur));
  const kAssenta = suaviza(parado / 0.4); // 0..1: o passinho de acomodação depois de chegar
  const s = sMarcha + zFinal * kAssenta;

  const {p, rotY: dir} = noCaminho(c.caminho, s);
  // altura do chão sob um pé que está na distância ss do caminho, do lado l (o pé tem ~25 cm)
  const chaoEm = (ss: number, l: 1 | -1) => {
    const q = noCaminho(c.caminho, ss);
    return alturaChao(q.p[0] + Math.cos(q.rotY) * LADO * l, q.p[2] - Math.sin(q.rotY) * LADO * l, c.chao);
  };
  const chaoPe = (ss: number, l: 1 | -1) => {
    // meio pé apoiado já sustenta
    const h = Math.max(chaoEm(ss - 0.05 * esc, l), chaoEm(ss + 0.05 * esc, l));
    // vão estreito (< ~40 cm) entre dois apoios: o pé passa por cima, não desce no buraco
    const atras = chaoEm(ss - 0.2 * esc, l);
    const frente = chaoEm(ss + 0.2 * esc, l);
    return Math.max(h, Math.min(atras, frente));
  };
  const plantado = pePlantado(L / D + inicio);
  const pes = ([-1, 1] as const).map((l): Pe => {
    const pp = pePasso(fase, l, passada, correndo);
    if (parado > 0) {
      if (l === plantado.l) return {z: pp.z - zFinal * kAssenta, ergue: 0, ponta: 0, noChao: true, base: chaoPe(L + pp.z, l)};
      // o outro pé dá um passinho até ficar ao lado do plantado
      const mexendo = kAssenta > 0 && kAssenta < 1;
      const b0 = chaoPe(L + pp.z, l);
      const b1 = chaoPe(Ltotal, l);
      const sobe = Math.abs(b1 - b0) * Math.sin(Math.PI * Math.min(1, kAssenta * 1.6)) * 0.7;
      return {z: pp.z * (1 - kAssenta), ergue: 0.07 * Math.sin(Math.PI * kAssenta) + sobe, ponta: 0, noChao: !mexendo, base: b0 + (b1 - b0) * suaviza(kAssenta * 1.25)};
    }
    if (pp.noChao) return {z: pp.z, ergue: 0, ponta: 0, noChao: true, base: chaoPe(sMarcha + pp.z, l)};
    // no ar: a altura vai do chão onde ele saiu ao chão onde vai pisar
    const sSaiu = sMarcha - pp.u * (1 - pp.apoio) * pp.D - pp.meia;
    const sPisa = sMarcha + (1 - pp.u) * (1 - pp.apoio) * pp.D + pp.meia;
    const b0 = chaoPe(sSaiu, l);
    const b1 = chaoPe(sPisa, l);
    const k = suaviza(pp.u);
    // subindo degrau: ergue o pé o bastante para não raspar a quina
    const extra = b1 > b0 ? (b1 - b0) * Math.sin(Math.PI * Math.min(1, pp.u * 1.6)) * 0.6 : 0;
    return {z: pp.z, ergue: pp.ergue * intensidade + extra, ponta: pp.ponta * intensidade, noChao: false, base: b0 + (b1 - b0) * k};
  });
  // o corpo fica na altura do pé mais baixo; cada pé recebe a sua diferença
  const y0 = Math.min(pes[0].base, pes[1].base);
  const pesRel = pes.map((q) => ({...q, base: q.base - y0}));
  const rotY = parado > 0 && c.rotFinal !== undefined ? lerp(dir, c.rotFinal, suaviza((parado - 0.3) / 0.5)) : dir;
  const pose: Pose = {fase, passada, intensidade, correndo, pes: pesRel};
  return {pos: [p[0], y0, p[2]] as V3, rotY, pose, s, andando: ds > 0.0005 || (kAssenta > 0 && kAssenta < 1), chegou: kAssenta >= 1};
};

// ---------- Separar (dois corpos nunca no mesmo lugar) ----------
// Recebe as posições do quadro e empurra para fora quem estiver mais perto que 2 × raio (0,3 = ombro a ombro).
// Rode DEPOIS de calcular todas as posições do quadro e use as posições devolvidas.
export const separar = (posicoes: V3[], raio = 0.3, fixos: boolean[] = []): V3[] => {
  const p = posicoes.map((q) => [...q] as V3);
  for (let it = 0; it < 4; it++) {
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++) {
        const dx = p[j][0] - p[i][0];
        const dz = p[j][2] - p[i][2];
        const d = Math.hypot(dx, dz);
        const min = raio * 2;
        if (d >= min) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        const falta = min - d;
        const wi = fixos[i] ? 0 : fixos[j] ? 1 : 0.5;
        const wj = fixos[j] ? 0 : fixos[i] ? 1 : 0.5;
        p[i][0] -= nx * falta * wi;
        p[i][2] -= nz * falta * wi;
        p[j][0] += nx * falta * wj;
        p[j][2] += nz * falta * wj;
      }
  }
  return p;
};

// ---------- Mola física (entrada com passa-e-volta) ----------
// 0 → 1 com oscilação amortecida de verdade (melhor que Easing.back: o quique diminui sozinho).
export const mola = (t: number, ini: number, {freq = 2.2, amort = 0.45}: {freq?: number; amort?: number} = {}) => {
  const tau = t - ini;
  if (tau <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = Math.min(0.99, amort);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
};

// ---------- Queda com quique ----------
// Objeto solto de `de` cai até `chaoY` (o topo do que está embaixo + metade da altura dele) e quica até parar.
// `restituicao` 0,2 = caixa de papelão; 0,45 = plástico duro; 0,7 = bola.
export const queda = (
  t: number,
  {ini, de, chaoY, vel = [0, 0, 0], restituicao = 0.35, atrito = 0.6}: {ini: number; de: V3; chaoY: number; vel?: V3; restituicao?: number; atrito?: number},
) => {
  let tau = Math.max(0, t - ini);
  let [x, y, z] = de;
  let [vx, vy, vz] = vel;
  let quiques = 0;
  let pousou = false;
  let impacto = 0; // 0..1: amassadinho do último pouso (use para achatar o objeto)
  for (let i = 0; i < 12; i++) {
    // tempo até tocar o chão: y + vy·τ − g·τ²/2 = chaoY
    const a = -G / 2;
    const b = vy;
    const c = y - chaoY;
    const disc = b * b - 4 * a * c;
    const tc = disc < 0 ? 0 : (-b - Math.sqrt(disc)) / (2 * a);
    if (tau < tc) {
      x += vx * tau;
      z += vz * tau;
      y += vy * tau + a * tau * tau;
      return {pos: [x, y, z] as V3, pousou, quiques, impacto: impacto * Math.exp(-tau * 18)};
    }
    tau -= tc;
    x += vx * tc;
    z += vz * tc;
    const vImp = Math.abs(vy - G * tc);
    impacto = Math.min(1, vImp / 6);
    vy = vImp * restituicao;
    vx *= atrito;
    vz *= atrito;
    y = chaoY;
    quiques++;
    pousou = true;
    if (vy < 0.25) {
      // parou de quicar: escorrega um tiquinho e assenta
      const freio = 1 - Math.exp(-tau * 6);
      return {pos: [x + (vx / 6) * freio, chaoY, z + (vz / 6) * freio] as V3, pousou, quiques, impacto: impacto * Math.exp(-tau * 18)};
    }
  }
  return {pos: [x, chaoY, z] as V3, pousou: true, quiques, impacto: 0};
};

// ---------- Pulo do boneco ----------
// Agacha (0,18 s), sobe em parábola de verdade até `para` e amortece ao pousar.
// Devolve a posição dos pés e a pose (agachar) para o <Boneco>.
export const pular = (t: number, {ini, de, para, altura = 0.5}: {ini: number; de: V3; para: V3; altura?: number}) => {
  const prep = 0.18;
  const tau = t - ini;
  const subida = Math.sqrt((2 * altura) / G);
  const dy = para[1] - de[1];
  const descida = Math.sqrt((2 * Math.max(0.05, altura - dy)) / G);
  const voo = subida + descida;
  const rotY = Math.atan2(para[0] - de[0], para[2] - de[2]);
  if (tau < prep) {
    const k = suaviza(tau / prep);
    return {pos: de, rotY, pose: {agachar: 0.55 * k} as Pose, noAr: false};
  }
  const tv = tau - prep;
  if (tv < voo) {
    const k = tv / voo;
    const y = de[1] + ((2 * altura) / subida) * tv - (G / 2) * tv * tv;
    return {pos: [lerp(de[0], para[0], k), Math.max(y, Math.min(de[1], para[1])), lerp(de[2], para[2], k)] as V3, rotY, pose: {agachar: 0.15, bracosAlto: 1 - Math.abs(k - 0.4), noAr: true} as Pose, noAr: true};
  }
  const tp = tv - voo;
  const amortece = Math.exp(-tp * 7) * Math.sin(Math.min(Math.PI, tp * 9));
  return {pos: para, rotY, pose: {agachar: Math.max(0, 0.6 * amortece)} as Pose, noAr: false};
};
