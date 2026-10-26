// Checagem automática do vídeo (v1.2): ela enxerga os defeitos que fazem um vídeo parecer amador.
// Uso: GL=angle node scripts/qa.mjs <Composicao> [rapido|completo] [inicio-fim em segundos]
//   rapido (padrão): pares de quadros a cada 1/3 s + rajadas de 5 quadros a cada 2 s (pega os mesmos defeitos em
//                    ~1/4 do tempo). completo: todos os quadros (use no fim, antes do render, se der tempo).
// Renderiza em miniatura com a opção {qa: true}. Cada quadro, a cena se descreve (peças, câmera,
// bonecos, pés) e a imagem é medida por região. Aqui cruzamos tudo e listamos, com o segundo exato:
//
//   ERROS (corrija antes de mostrar qualquer quadro):
//   ATRAVESSANDO            uma peça dentro de outra (braço na parede, objeto dentro da bancada)
//   ENTRADA SEM TRANSIÇÃO   algo apareceu do nada (use <Entra>) · SAÍDA SEM TRANSIÇÃO: sumiu do nada
//   SURGE DO NADA           objeto que cresce a partir do zero sem <Entra> (escala animada na mão)
//   FORA DO QUADRO          cabeça do boneco cortada / atrás da interface / boneco grande demais / assunto fora da área
//   CÂMERA DENTRO DE OBJETO a câmera está dentro de uma peça (o quadro fica preto ou tapado)
//   ASSUNTO TAPADO          uma peça opaca entre a câmera e o que a cena quer mostrar
//   Z-FIGHTING              duas superfícies no mesmo plano: vão piscar no vídeo
//   PISCA                   região da imagem acendendo e apagando quadro a quadro
//   QUADRO ESCURO           quase tudo preto no meio do vídeo (câmera dentro de algo, luz apagada)
//   PÉ DESLIZANDO / PÉ FLUTUANDO / PÉ AFUNDANDO
//   RITMO LENTO / CENA LONGA   menos de 1 cena a cada ~4 s (o vídeo fica parado)
//   AVISOS (olhe e decida): PLANO REPETIDO, CENA CURTA, PARTÍCULA GRANDE, SÉRIE NÃO ESCOLHIDA
//
// Sai com código 1 se houver ERRO. O Claude corrige e roda de novo até "TUDO CERTO".
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {vigiarMemoria} from './memoria.mjs';
import {openBrowser, renderFrames, selectComposition} from '@remotion/renderer';

const [id, modoArg, trecho] = process.argv.slice(2);
if (!id) {
  console.error('Uso: GL=angle node scripts/qa.mjs <Composicao> [rapido|completo] [inicio-fim em segundos]');
  process.exit(2);
}
// (compatível com a forma antiga: um número no lugar do modo = passo do modo completo)
const COMPLETO = modoArg === 'completo' || /^\d+$/.test(modoArg ?? '');
const PASSO = /^\d+$/.test(modoArg ?? '') ? Math.max(1, Number(modoArg)) : 1;
// Os avisos QA|… vêm do navegador; o Remotion repete cada um no terminal. Escondemos essas linhas
// (e chamamos o callback de quem escreveu, senão o Remotion trava esperando).
const filtra = (orig) => (txt, ...r) => {
  if (!String(txt).includes('QA|')) return orig(txt, ...r);
  const cb = r.find((x) => typeof x === 'function');
  if (cb) process.nextTick(cb);
  return true;
};
process.stdout.write = filtra(process.stdout.write.bind(process.stdout));
process.stderr.write = filtra(process.stderr.write.bind(process.stderr));

const W = 1080;
const H = 1920;
const AREA = {topo: 540, base: 1330, esq: 90, dir: 990};
const LIM = {atravessa: 0.03, desliza: 0.03, flutua: 0.04, afunda: 0.04, areaMin: 6000, pisca: 12, particula: 26};

const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-public-'));
for (const nome of fs.readdirSync('projetos')) fs.symlinkSync(path.resolve('projetos', nome), path.join(publicDir, nome));
console.log('Preparando…');
const pararVigia = vigiarMemoria('checagem');
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir});
const navegador = path.join(os.homedir(), 'Library/Caches/remotion-browser/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browserExecutable = fs.existsSync(navegador) ? navegador : null;
const chromiumOptions = process.env.GL ? {gl: process.env.GL} : {};
const inputProps = {...(process.env.PROPS ? JSON.parse(process.env.PROPS) : {}), qa: true};
console.log('Abrindo o navegador de render (na 1ª vez ele é baixado: pode levar alguns minutos)…');
const composition = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 120000});
const fps = composition.fps;
let q0 = 0;
let q1 = composition.durationInFrames - 1;
if (trecho) {
  const [a, b] = trecho.split('-').map(Number);
  q0 = Math.max(0, Math.round(a * fps));
  q1 = Math.min(q1, Math.round(b * fps));
}
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
// quadros que a checagem quer ver: [deslocamento, a cada N quadros]. Rápido = pares seguidos a cada 1/3 s (pegam
// pisca e movimento) + rajadas de 5 quadros a cada 2 s. Completo = todos.
// v1.3: o Remotion não renderiza quadros soltos (o everyNthFrame só pega múltiplos exatos: as passadas com deslocamento
// repetiam a 1ª e a checagem olhava ~40% do vídeo, sem nenhum par de quadros seguidos). Agora renderizamos uma
// sequência contínua 0..N-1 e o vídeo traduz cada quadro para o quadro real da lista (useQuadro, em src/base/qa.tsx).
const PASSADAS = COMPLETO ? [[0, PASSO]] : [[0, 10], [1, 10], [2, 60], [3, 60], [4, 60]];
const LISTA = [...new Set(PASSADAS.flatMap(([d, n]) => {
  const out = [];
  for (let q = q0 + d; q <= q1; q += n) out.push(q);
  return out;
}))].sort((a, b) => a - b);
const total = LISTA.length;
const abas = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
console.log(`Checando ${total} quadros de ${((q1 - q0 + 1) / fps).toFixed(1)} s (modo ${COMPLETO ? 'completo' : 'rápido'}, ${abas} abas)…`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-quadros-'));
const cenas = new Map(); // quadro -> registro da cena 3D
const videos = new Map(); // quadro -> registro do vídeo (cena atual, lista de cenas)
const pes = new Map(); // quadro -> pés
const guarda = (log) => {
  const txt = log.text ?? '';
  const i = txt.indexOf('QA|');
  if (i < 0) return;
  try {
    const d = JSON.parse(txt.slice(i + 3));
    if (d.tipo === 'cena') cenas.set(d.q, d);
    else if (d.tipo === 'video') videos.set(d.q, d);
    else if (d.tipo === 'pe') {
      if (!pes.has(d.q)) pes.set(d.q, []);
      pes.get(d.q).push(d);
    }
  } catch {
    /* linha cortada: ignora */
  }
};
let ultimo = -1;
const saidaQuadros = path.join(tmp, 'q');
fs.mkdirSync(saidaQuadros);
await renderFrames({
  serveUrl,
  composition,
  inputProps: {...inputProps, qaQuadros: LISTA},
  frameRange: [0, total - 1],
  outputDir: saidaQuadros,
  imageFormat: 'jpeg',
  jpegQuality: 50,
  scale: 0.25,
  // na checagem não há pós-processamento (ver AcabamentoCinema), então várias abas podem renderizar ao mesmo tempo
  concurrency: abas,
  browserExecutable,
  chromiumOptions,
  puppeteerInstance: browser,
  onBrowserLog: guarda,
  logLevel: 'error',
  timeoutInMilliseconds: 120000,
  onStart: () => {},
  onFrameUpdate: (n) => {
    const p = Math.floor((n / total) * 10) * 10;
    if (p !== ultimo) {
      ultimo = p;
      process.stdout.write(`  ${p}%\n`);
    }
  },
});
await browser.close({silent: true});

if (process.env.QA_DUMP) fs.writeFileSync(process.env.QA_DUMP, JSON.stringify([...cenas.values()]));
// ---------- brilho por região (9 × 16 células) de cada quadro ----------
const arquivos = []; // {arq, q}
for (const f of fs.readdirSync(saidaQuadros).filter((x) => /\.jpe?g$/.test(x)).sort()) {
  const k = Number((f.match(/(\d+)\.jpe?g$/) ?? [])[1]); // quadro renderizado k = quadro real LISTA[k]
  if (Number.isFinite(k) && k < LISTA.length) arquivos.push({arq: path.join(saidaQuadros, f), q: LISTA[k]});
}
const lum = new Map(); // quadro -> Uint8Array(144)
if (arquivos.length) {
  const lista = path.join(tmp, 'lista.txt');
  fs.writeFileSync(lista, arquivos.map((x) => `file '${x.arq}'`).join('\n'));
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-vf', 'scale=9:16:flags=area,format=gray', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 28});
  arquivos.forEach((x, k) => lum.set(x.q, raw.subarray(k * 144, k * 144 + 144)));
}
for (const d of [tmp, publicDir]) fs.rmSync(d, {recursive: true, force: true});

// ---------- geometria ----------
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const ENC = {s: 0.85, l: 0.88, c: 0.92};
const peca = (e) => {
  const [chave, dono, donoTipo, tag, transicao, geo, op, cx, cy, cz, ax, ay, az, bx, by, bz, ex, ey, ez, x0, y0, x1, y1, rPart, ignora] = e;
  const f = ENC[geo] ?? 1;
  const eixos = [[ax, ay, az], [bx, by, bz], [ex, ey, ez]];
  const meio = eixos.map((v) => len(v) * f);
  const un = eixos.map((v) => {
    const l = len(v) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  });
  // placa (espessura zero): o eixo que falta é o produto vetorial dos outros dois
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  for (let k = 0; k < 3; k++)
    if (len(eixos[k]) < 1e-6) {
      const c = cruz(un[(k + 1) % 3], un[(k + 2) % 3]);
      const l = len(c) || 1;
      un[k] = [c[0] / l, c[1] / l, c[2] / l];
    }
  const cl = [Math.max(0, Math.min(W, x0)), Math.max(0, Math.min(H, y0)), Math.max(0, Math.min(W, x1)), Math.max(0, Math.min(H, y1))];
  const areaTela = Math.max(0, cl[2] - cl[0]) * Math.max(0, cl[3] - cl[1]);
  const ext = [0, 1, 2].map((k) => un.reduce((s, u, i) => s + Math.abs(u[k]) * meio[i], 0));
  return {chave, dono, donoTipo, tag, transicao: Boolean(transicao), geo, op, c: [cx, cy, cz], un, meio, tela: [x0, y0, x1, y1], areaTela, rPart, ignora: ignora ?? [], min: [cx - ext[0], cy - ext[1], cz - ext[2]], max: [cx + ext[0], cy + ext[1], cz + ext[2]], tam: Math.max(...meio) * 2};
};
// penetração entre duas caixas orientadas (teste dos eixos separadores); 0 = não se tocam
const penetra = (a, b) => {
  for (let k = 0; k < 3; k++) if (a.max[k] < b.min[k] || b.max[k] < a.min[k]) return 0;
  const eixos = [...a.un, ...b.un];
  for (const u of a.un) for (const v of b.un) {
    const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = len(c);
    if (l > 1e-4) eixos.push([c[0] / l, c[1] / l, c[2] / l]);
  }
  const d = sub(b.c, a.c);
  let menor = Infinity;
  for (const n of eixos) {
    const ra = a.un.reduce((s, u, i) => s + Math.abs(dot(u, n)) * a.meio[i], 0);
    const rb = b.un.reduce((s, u, i) => s + Math.abs(dot(u, n)) * b.meio[i], 0);
    const o = ra + rb - Math.abs(dot(d, n));
    if (o <= 0) return 0;
    menor = Math.min(menor, o);
  }
  return menor;
};
const dentroDe = (p, a, folga = 0) => {
  const d = sub(p, a.c);
  return a.un.every((u, i) => Math.abs(dot(d, u)) <= a.meio[i] + folga);
};
const NOME_GEO = {b: 'caixa', p: 'placa', s: 'esfera', c: 'cilindro', l: 'peça torneada', r: 'anel', t: 'aro', o: 'peça'};
const f2 = (x) => x.toFixed(2).replace('.', ',');
const descreve = (p, porDono) => {
  if (p.donoTipo === 'boneco') return `boneco "${p.dono}"`;
  if (p.donoTipo === 'solido' && !p.dono.startsWith('solido:')) return porDono?.peca ? `"${p.dono}" (${NOME_GEO[p.geo] ?? 'peça'} ${p.meio.map((m) => f2(m * 2)).join('×')} m em ${p.c.map(f2).join('; ')})` : `"${p.dono}"`;
  // objeto sem nome: a peça exata (medidas e posição, para achar no código) e o objeto de que ela faz parte
  const peca = (g) => `${NOME_GEO[g.geo] ?? 'peça'} ${g.meio.map((m) => f2(m * 2)).join('×')} m em ${g.c.map(f2).join('; ')}`;
  const grupo = porDono?.get(p.dono) ?? [p];
  const g = grupo.reduce((m, x) => (x.tam > m.tam ? x : m), grupo[0]);
  return g === p || grupo.length === 1 ? `objeto (${peca(p)})` : `peça (${peca(p)}) do objeto (${peca(g)})`;
};
const regiao = (cel) => {
  const r = Math.floor(cel / 9);
  const c = cel % 9;
  return `${r < 6 ? 'em cima' : r < 11 ? 'no meio' : 'embaixo'}, ${c < 3 ? 'à esquerda' : c < 6 ? 'no centro' : 'à direita'}`;
};

// ---------- análise ----------
const problemas = []; // {q, chave, texto, nivel}
const erro = (q, chave, texto) => problemas.push({q, chave, texto, nivel: 'ERRO'});
const aviso = (q, chave, texto) => problemas.push({q, chave, texto, nivel: 'AVISO'});
const quadros = [...new Set([...cenas.keys(), ...lum.keys(), ...videos.keys()])].sort((a, b) => a - b);
const pecasDe = new Map();
for (const [q, c] of cenas) pecasDe.set(q, c.m.map(peca));
const cenaDe = (q) => videos.get(q)?.cena ?? -1;
// amostra anterior (para entradas/saídas) e o quadro seguinte (para pés), conforme o que foi renderizado
const amostradas = [...cenas.keys()].sort((a, b) => a - b);
const anterior = new Map(amostradas.map((q, i) => [q, i > 0 ? amostradas[i - 1] : null]));
const seguinte = (q) => (cenas.has(q + 1) ? q + 1 : COMPLETO && cenas.has(q + PASSO) ? q + PASSO : null);
const ultimoQ = composition.durationInFrames - 1;
const nSolidos = new Set();
const nBonecos = new Set();

for (const q of quadros) {
  const c = cenas.get(q);
  const ps = pecasDe.get(q) ?? [];
  const porDono = new Map();
  for (const p of ps) {
    if (!porDono.has(p.dono)) porDono.set(p.dono, []);
    porDono.get(p.dono).push(p);
    if (p.donoTipo === 'solido') nSolidos.add(p.dono);
    if (p.donoTipo === 'boneco') nBonecos.add(p.dono);
  }
  const solidas = ps.filter((p) => !p.tag && p.op >= 0.6);
  if (c) {
    // atravessando (peça a peça, entre objetos diferentes)
    for (let i = 0; i < solidas.length; i++)
      for (let j = i + 1; j < solidas.length; j++) {
        const a = solidas[i];
        const b = solidas[j];
        if (a.dono === b.dono) continue;
        if (a.ignora.includes(b.dono) || b.ignora.includes(a.dono)) continue;
        if (a.areaTela <= 0 && b.areaTela <= 0) continue;
        const prof = penetra(a, b);
        const minimo = Math.max(LIM.atravessa, Math.min(a.tam, b.tam) * 0.12);
        if (prof > minimo) {
          const [x, y] = [descreve(a, porDono), descreve(b, porDono)].sort();
          erro(q, `atravessa|${x}|${y}`, `ATRAVESSANDO: ${x} e ${y} (${Math.round(prof * 100)} cm um dentro do outro). Afaste, mude o tempo, ou se é o mesmo objeto junte as peças num <group>/<Solido id>.`);
        }
      }
    // z-fighting: faces no mesmo plano, viradas para o mesmo lado, se sobrepondo
    const planas = ps.filter((p) => !p.tag && p.op >= 0.6 && (p.geo === 'b' || p.geo === 'p') && p.areaTela > 400);
    for (let i = 0; i < planas.length; i++)
      for (let j = i + 1; j < planas.length; j++) {
        const a = planas[i];
        const b = planas[j];
        // a mesma peça desenhada duas vezes (idêntica) não pisca: a profundidade é igual
        if (len(sub(a.c, b.c)) < 1e-3 && a.meio.every((m, ii) => Math.abs(m - b.meio[ii]) < 1e-3)) continue;
        let briga = false;
        for (let ia = 0; ia < 3 && !briga; ia++)
          for (let jb = 0; jb < 3 && !briga; jb++) {
            const u = a.un[ia];
            if (Math.abs(dot(u, b.un[jb])) < 0.9995) continue;
            for (const s of [1, -1]) {
              const offA = dot(a.c, u) + s * a.meio[ia];
              const offB = dot(b.c, u) + s * b.meio[jb];
              if (Math.abs(offA - offB) > 0.001) continue;
              // só pisca o que a câmera vê: a face precisa estar virada para ela
              const centroFace = [a.c[0] + u[0] * s * a.meio[ia], a.c[1] + u[1] * s * a.meio[ia], a.c[2] + u[2] * s * a.meio[ia]];
              if (dot(sub(c.cam.pos, centroFace), [u[0] * s, u[1] * s, u[2] * s]) <= 0) continue;
              const outros = [0, 1, 2].filter((k) => k !== ia);
              const ok = outros.every((k) => {
                const v = a.un[k];
                const rb = b.un.reduce((acc, w, m) => acc + Math.abs(dot(w, v)) * b.meio[m], 0);
                const sob = Math.min(dot(a.c, v) + a.meio[k], dot(b.c, v) + rb) - Math.max(dot(a.c, v) - a.meio[k], dot(b.c, v) - rb);
                return sob > 0.01;
              });
              if (ok) briga = true;
            }
          }
        if (briga) {
          const comPeca = Object.assign(new Map(porDono), {peca: true});
          const [x, y] = [descreve(a, comPeca), descreve(b, comPeca)].sort();
          erro(q, `zfight|${x}|${y}`, `Z-FIGHTING (vai piscar): ${x} e ${y} têm faces no mesmo plano. Deixe uma delas pelo menos 3 mm menor ou mais para dentro (casca de objeto: cada parede 3 mm menor que a outra).`);
        }
      }
    // câmera dentro de objeto
    for (const p of solidas) if (dentroDe(c.cam.pos, p, c.cam.near)) erro(q, `camdentro|${descreve(p, porDono)}`, `CÂMERA DENTRO DE OBJETO: a câmera está dentro de ${descreve(p, porDono)}. Escolha outro ângulo (de) ou afaste.`);
    // assunto tapado
    for (const tp of c.tapado ?? []) {
      const quem = ps.find((p) => p.dono === tp.dono);
      erro(q, `tapado|${tp.dono}`, `ASSUNTO TAPADO: ${quem ? descreve(quem, porDono) : 'um objeto'} está entre a câmera e o assunto da cena. Mude o ângulo (de) ou tire o objeto do caminho.`);
    }
    // enquadramento: alvos dentro da área livre
    if (c.temAlvos) {
      const fora = (c.alvos ?? []).filter((a) => !a || a[0] < AREA.esq - 40 || a[0] > AREA.dir + 40 || a[1] < AREA.topo - 60 || a[1] > AREA.base + 60).length;
      if (fora) erro(q, 'alvosfora', `FORA DO QUADRO: ${fora} ponto(s) do assunto fora da área livre (atrás da pílula, da legenda ou fora da tela). Use camera({alvos, de}) sem mexer na posição depois.`);
    }
    // bonecos
    for (const b of c.bonecos ?? []) {
      const [x0, y0, x1, y1] = b.ret;
      if (x1 < 0 || x0 > W || y1 < 0 || y0 > H || x0 < -9000) continue;
      const altura = y1 - y0;
      if (c.cam.ombro) {
        // por cima do ombro: o boneco pode aparecer cortado no canto, mas não pode cobrir o meio do quadro
        const cx0 = Math.max(x0, AREA.esq), cx1 = Math.min(x1, AREA.dir), cy0 = Math.max(y0, AREA.topo), cy1 = Math.min(y1, AREA.base);
        const cobre = Math.max(0, cx1 - cx0) * Math.max(0, cy1 - cy0) / ((AREA.dir - AREA.esq) * (AREA.base - AREA.topo));
        if (cobre > 0.4) erro(q, `ombro|${b.id}`, `FORA DO QUADRO: no plano por cima do ombro, o boneco "${b.id}" cobre ${Math.round(cobre * 100)}% da área do assunto. O ombro deve ficar no canto: afaste (alvos menores) ou troque o lado (lado: -1/1).`);
        continue;
      }
      if (altura > H * 1.15) erro(q, `grande|${b.id}`, `FORA DO QUADRO: boneco "${b.id}" grande demais (${Math.round((altura / H) * 100)}% da altura da tela, cortado). Enquadre de mais longe: camera({alvos: pessoa(pos)}) ou busto(pos).`);
      if (!b.cab) continue;
      const [hx, hy] = b.cab;
      if (hx < 0 || hx > W || hy < 0 || hy > H) erro(q, `cabeca|${b.id}`, `FORA DO QUADRO: a cabeça do boneco "${b.id}" está fora da tela (corpo aparece, cabeça não). Inclua pessoa(pos) ou busto(pos) nos alvos da câmera.`);
      else if (hy < 400 || hy > 1340) erro(q, `cabecaui|${b.id}`, `FORA DO QUADRO: a cabeça do boneco "${b.id}" está atrás da ${hy < 400 ? 'pílula/marca do topo' : 'legenda'}. Inclua pessoa(pos)/busto(pos) nos alvos.`);
    }
    // partículas grandes
    for (const p of ps) if (p.tag === 'particula' && p.rPart > LIM.particula) aviso(q, `particula|${p.chave}`, `PARTÍCULA GRANDE (${Math.round(p.rPart)} px): parece bola cinza. Diminua \`escala\` das Particulas ou use a poeira automática do CanvasCinema.`);
  }
  // pés
  for (const pe of pes.get(q) ?? []) {
    nBonecos.add(pe.id);
    if (!pe.apoio) continue;
    let apoio = 0;
    for (const s of solidas) {
      if (s.donoTipo === 'boneco') continue;
      if (pe.p[0] < s.min[0] - 0.13 || pe.p[0] > s.max[0] + 0.13 || pe.p[2] < s.min[2] - 0.13 || pe.p[2] > s.max[2] + 0.13) continue;
      if (s.max[1] <= pe.p[1] + 0.15 && s.max[1] > apoio) apoio = s.max[1];
    }
    const dif = pe.p[1] - apoio;
    if (dif > LIM.flutua) erro(q, `flutua|${pe.id}|${pe.lado}`, `PÉ FLUTUANDO: "${pe.id}" pé ${pe.lado} ${Math.round(dif * 100)} cm acima do apoio (falta a superfície no \`chao\` do andar()).`);
    if (dif < -LIM.afunda) erro(q, `afunda|${pe.id}|${pe.lado}`, `PÉ AFUNDANDO: "${pe.id}" pé ${pe.lado} ${Math.round(-dif * 100)} cm abaixo do apoio.`);
    const qs = seguinte(q);
    const prox = qs === null ? null : pes.get(qs)?.find((o) => o.id === pe.id && o.lado === pe.lado);
    if (prox?.apoio && cenaDe(q) === cenaDe(qs)) {
      const d = Math.hypot(prox.p[0] - pe.p[0], prox.p[2] - pe.p[2]) / (qs - q);
      if (d > LIM.desliza) erro(q, `desliza|${pe.id}|${pe.lado}`, `PÉ DESLIZANDO: "${pe.id}" pé ${pe.lado} escorregou ${Math.round(d * 100)} cm em 1 quadro (use andar(); não mova o boneco na mão).`);
    }
  }
  // entradas e saídas (comparando com a amostra anterior da MESMA cena)
  const qa = anterior.get(q) ?? -1;
  if (q - qa <= 12 && pecasDe.has(qa) && c && cenaDe(qa) === cenaDe(q) && cenas.get(qa)) {
    const antes = pecasDe.get(qa);
    const mapaA = new Map(antes.map((p) => [p.chave, p]));
    const mapaB = new Map(ps.map((p) => [p.chave, p]));
    const novos = ps.filter((p) => !mapaA.has(p.chave));
    const sumiram = antes.filter((p) => !mapaB.has(p.chave));
    // a mesma peça pode ter trocado de "endereço" (outra peça apareceu antes dela no código): casa por lugar e tamanho
    const casa = (p, lista) => lista.findIndex((o) => o.geo === p.geo && len(sub(o.c, p.c)) < 0.05 + p.tam * 0.1 && Math.abs(o.tam - p.tam) < 0.02 + p.tam * 0.1);
    for (let i = novos.length - 1; i >= 0; i--) {
      const j = casa(novos[i], sumiram);
      if (j >= 0) {
        sumiram.splice(j, 1);
        novos.splice(i, 1);
      }
    }
    const visivel = (p) => !p.tag && p.op >= 0.5 && p.areaTela >= LIM.areaMin && !p.transicao;
    for (const p of novos) if (visivel(p)) erro(q, `entra|${p.chave}`, `ENTRADA SEM TRANSIÇÃO: ${descreve(p, porDono)} apareceu do nada. Envolva em <Entra t={t} em={T.x} modo="cai|cresce|desliza|aparece">.`);
    for (const p of sumiram) if (visivel(p)) erro(q, `sai|${p.chave}`, `SAÍDA SEM TRANSIÇÃO: ${descreve(p, new Map())} sumiu do nada. Use <Entra … sai={T.y}> (sai em fade, deslizando ou encolhendo).`);
    for (const p of ps) {
      const a = mapaA.get(p.chave);
      if (!a || p.transicao || p.tag || p.areaTela < LIM.areaMin) continue;
      if (a.tam < p.tam * 0.15 && p.op >= 0.5) erro(q, `cresce|${p.chave}`, `SURGE DO NADA: ${descreve(p, porDono)} cresce a partir do zero (escala animada na mão). Use <Entra modo="cresce"> (cresce do apoio, sem pop).`);
      if (q - qa === 1 && a.op < 0.2 && p.op > 0.8) erro(q, `opac|${p.chave}`, `ENTRADA SEM TRANSIÇÃO: ${descreve(p, porDono)} passou de invisível a visível em 1 quadro.`);
    }
  }
  // brilho por região: pisca (sobe e desce em quadros seguidos) e quadro escuro
  // pisca = acende, apaga, acende de novo em quadros seguidos (um objeto rápido passando só faz sobe-desce uma vez)
  const L1 = lum.get(q);
  const L0 = lum.get(q - 1);
  const L2 = lum.get(q + 1);
  const L3 = lum.get(q + 2);
  const L4 = lum.get(q + 3);
  // 4 alternâncias seguidas: um quique ou um objeto passando não fazem isso; superfície brigando e cor trocando, sim
  if (L1 && L0 && L2 && L3 && L4 && [q - 1, q + 1, q + 2, q + 3].every((x) => cenaDe(x) === cenaDe(q))) {
    for (let cel = 0; cel < 144; cel++) {
      const ds = [L1[cel] - L0[cel], L2[cel] - L1[cel], L3[cel] - L2[cel], L4[cel] - L3[cel]];
      if (ds.every((d) => Math.abs(d) > LIM.pisca) && ds.every((d, i) => i === 0 || Math.sign(d) !== Math.sign(ds[i - 1]))) {
        erro(q, `pisca|${regiao(cel)}`, `PISCA: a imagem acende e apaga ${regiao(cel)} da tela (quadro a quadro). Procure duas superfícies no mesmo lugar, algo trocando de cor/forma a cada quadro ou Math.random/seno rápido.`);
        break;
      }
    }
  }
  if (L1 && q > fps * 0.5 && q < ultimoQ - fps * 0.7) {
    let s = 0;
    for (let cel = 36; cel < 99; cel++) s += L1[cel];
    if (s / 63 < 14) erro(q, 'escuro', `QUADRO ESCURO: o meio da imagem está quase preto (câmera dentro de um objeto ou cena sem luz).`);
  }
}

// ---------- ritmo e série (do registro do vídeo) ----------
const v = [...videos.values()][0];
if (v) {
  const lista = v.cenas;
  const dur = v.dur;
  const durs = lista.map((c, i) => (i + 1 < lista.length ? lista[i + 1].em : dur) - (i === 0 ? 0 : c.em));
  const media = dur / lista.length;
  const inteiro = trecho === undefined;
  if (inteiro && media > 4.2) problemas.push({q: 0, chave: 'ritmo', nivel: 'ERRO', texto: `RITMO LENTO: ${lista.length} cenas em ${dur.toFixed(0)} s (1 a cada ${media.toFixed(1)} s). Meta do canal: 1 cena a cada 2,5–4 s (≈ ${Math.round(dur / 3.3)} cenas). Quebre as cenas longas em planos diferentes.`});
  lista.forEach((c, i) => {
    if (durs[i] > 6.5) problemas.push({q: Math.round(c.em * fps), chave: `longa|${i}`, nivel: 'ERRO', texto: `CENA LONGA: "${c.nome}" fica ${durs[i].toFixed(1)} s no ar (máximo ~6 s). Divida em 2 planos (mude o tipo: close, de cima, esquema…).`});
    if (durs[i] < 1.2 && i > 0) problemas.push({q: Math.round(c.em * fps), chave: `curta|${i}`, nivel: 'AVISO', texto: `CENA CURTA: "${c.nome}" dura só ${durs[i].toFixed(1)} s (o olho não acompanha).`});
    if (i > 0 && c.plano === lista[i - 1].plano) problemas.push({q: Math.round(c.em * fps), chave: `repete|${i}`, nivel: 'AVISO', texto: `PLANO REPETIDO: "${lista[i - 1].nome}" e "${c.nome}" são os dois "${c.plano}". Varie o tipo de plano a cada corte.`});
  });
  if (!v.serie) problemas.push({q: 0, chave: 'serie', nivel: 'AVISO', texto: `SÉRIE NÃO ESCOLHIDA: o topo mostra só "${v.assunto}". Rode a skill \`estilo\` com a pessoa para escolher o nome da série.`});
}

// junta quadros seguidos do mesmo problema num trecho só
const porChave = new Map();
for (const p of problemas.sort((a, b) => a.q - b.q)) {
  const arr = porChave.get(p.chave) ?? [];
  const ult = arr[arr.length - 1];
  if (ult && p.q - ult.fim <= 13) ult.fim = p.q;
  else arr.push({ini: p.q, fim: p.q, texto: p.texto, nivel: p.nivel});
  porChave.set(p.chave, arr);
}
const trechos = [...porChave.values()].flat().sort((a, b) => a.ini - b.ini);
const seg = (q) => (q / fps).toFixed(1).replace('.', ',');
const nomeCena = (q) => {
  const r = videos.get(q);
  return r ? ` [cena ${r.cena + 1} "${r.nome}"]` : '';
};
console.log(`\nChecagem: ${id} · ${quadros.length} quadros · ${nBonecos.size} boneco(s) · ${nSolidos.size} sólido(s) marcados`);
if (!cenas.size) console.log('ATENÇÃO: nenhuma cena 3D se descreveu. As cenas precisam usar <CanvasCinema> (src/base/kit) para a checagem enxergar.');
const erros = trechos.filter((t) => t.nivel === 'ERRO');
const avisos = trechos.filter((t) => t.nivel === 'AVISO');
for (const t of erros) console.log(`- ${seg(t.ini)}–${seg(t.fim + 1)} s${nomeCena(t.ini)}: ${t.texto}`);
if (avisos.length) {
  console.log('\nAvisos (olhe e decida):');
  for (const t of avisos) console.log(`- ${seg(t.ini)} s${nomeCena(t.ini)}: ${t.texto}`);
}
const esperados = total;
if (cenas.size < esperados * 0.95) {
  console.log(`\nATENÇÃO: só ${cenas.size} de ${esperados} quadros foram checados (o navegador fechou no meio?). Rode de novo antes de confiar no resultado.`);
  process.exit(1);
}
if (!erros.length && cenas.size) {
  console.log('\nTUDO CERTO: nada atravessando, nada surgindo do nada, enquadramento, câmera, pés e ritmo ok.');
  process.exit(0);
}
console.log(`\n${erros.length} erro(s). Corrija a cena e rode de novo.`);
process.exit(1);
