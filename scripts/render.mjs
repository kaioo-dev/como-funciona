// Renderiza uma composição inteira em MP4 (h264) — v1.3: em pedaços retomáveis, com qualidade escolhida e previsão.
// Uso: node scripts/render.mjs <Composicao> <saida.mp4> [quadroInicial-quadroFinal]
//
// Qualidade (variável QUALIDADE):
//   final  (padrão) 1080×1920, tudo ligado. Com placa de vídeo (GL=angle) leva poucos minutos.
//   rapido          720×1280 desenhando o 3D já em 720p: ~2× mais rápido. Bom para postar quando não há placa de vídeo.
//   previa          540×960 sem foco/brilho/sombra de contato: ~5–8× mais rápido. Só para ver ritmo e enquadramento.
// Pedaços: o vídeo é renderizado em pedaços de 8 s em <saida>.partes/. Se o computador desligar ou o comando cair,
// rode o MESMO comando: ele pula os pedaços prontos e continua. No fim junta tudo, põe o áudio e apaga os pedaços.
// Outras opções: ABAS=1 (abas por pedaço; mais de 1 faz o 3D tremer), PARTES=n (pedaços ao mesmo tempo),
// PEDACO=240 (quadros por pedaço), MANTER_PARTES=1, SEM_AUDIO=1, PROPS='{"estilo":"lavanda"}'.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {vigiarMemoria} from './memoria.mjs';
import {renderMedia, selectComposition} from '@remotion/renderer';

const [id, saida, faixa] = process.argv.slice(2);
if (!id || !saida) {
  console.error('Uso: node scripts/render.mjs <Composicao> <saida.mp4> [quadroInicial-quadroFinal]');
  process.exit(1);
}
// v1.2: o texto de fábrica "SUA SÉRIE" nunca vai para um vídeo final. Escolha a série (skill `estilo`)
// ou deixe vazio (SERIE = '') para o topo mostrar só o assunto.
const estilo = fs.readFileSync('src/estilo.ts', 'utf8');
if (/SERIE\s*=\s*['"]SUA SÉRIE['"]/.test(estilo) && !/(Guia|Limpo|^Capa|Teste|Exemplo|^Overbooking|Estudio)/.test(id)) {
  console.error('PARE: src/estilo.ts ainda tem SERIE = \'SUA SÉRIE\'. Use a skill `estilo` para escolher o nome da série (ou SERIE = \'\').');
  process.exit(1);
}

const QUALIDADES = {
  final: {escala: 1, props: {}},
  rapido: {escala: 2 / 3, props: {dpr: 2 / 3}},
  previa: {escala: 0.5, props: {dpr: 0.5, leve: true}},
};
const nomeQ = (process.env.QUALIDADE ?? 'final').toLowerCase().replace('á', 'a').replace('é', 'e');
const Q = QUALIDADES[nomeQ];
if (!Q) {
  console.error(`QUALIDADE="${process.env.QUALIDADE}" não existe. Use final, rapido ou previa.`);
  process.exit(1);
}
// sem placa de vídeo (servidor Linux sem /dev/dri e sem GL=angle), o 1080p 3D é MUITO lento: avisa e sugere o rápido
const semPlaca = !process.env.GL && process.platform === 'linux' && !fs.existsSync('/dev/dri');
if (semPlaca && nomeQ === 'final') {
  console.log('Aviso: este computador não tem placa de vídeo. O 1080p 3D pode levar horas (~15 s por quadro).');
  console.log('       Para postar mais rápido: QUALIDADE=rapido (720p, ~2× mais rápido). Para só conferir: QUALIDADE=previa.');
}

// Pasta pública feita só de links (o bundle copia links como links); veja scripts/stills.mjs.
const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-public-'));
for (const nome of fs.readdirSync('projetos')) fs.symlinkSync(path.resolve('projetos', nome), path.join(publicDir, nome));
const pararVigia = vigiarMemoria('render');
console.log('Preparando o vídeo…');
const serveUrl = await bundle({entryPoint: path.resolve(process.env.ENTRADA ?? 'src/index.ts'), publicDir});

const navegador = path.join(os.homedir(), 'Library/Caches/remotion-browser/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browserExecutable = fs.existsSync(navegador) ? navegador : null;
// Cenas com Three.js usam a placa de vídeo no navegador headless: GL=angle node scripts/...
const chromiumOptions = process.env.GL ? {gl: process.env.GL} : {};
const inputProps = {...(process.env.PROPS ? JSON.parse(process.env.PROPS) : {}), ...Q.props};
const composition = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 180000});
fs.mkdirSync(path.dirname(path.resolve(saida)), {recursive: true});
const base = {inputProps, serveUrl, composition, timeoutInMilliseconds: 180000, browserExecutable, chromiumOptions, scale: Q.escala};
const ABAS = Number(process.env.ABAS ?? 1); // cenas 3D com pós-processamento: 1 aba (em abas paralelas a imagem treme)
const fmt = (s) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')} min` : s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);

// ---------- trecho pedido (teste): um render direto, sem pedaços ----------
if (faixa) {
  const [a, b] = faixa.split('-').map(Number);
  await renderMedia({...base, codec: 'h264', crf: 17, frameRange: [a, b], muted: process.env.SEM_AUDIO === '1', concurrency: ABAS, outputLocation: path.resolve(saida)});
  console.log(`pronto: ${saida} (quadros ${a}–${b}, qualidade ${nomeQ})`);
  process.exit(0);
}

// ---------- vídeo inteiro: pedaços retomáveis ----------
const total = composition.durationInFrames;
const T = Math.max(30, Number(process.env.PEDACO ?? 240));
const pasta = `${path.resolve(saida)}.partes`;
fs.mkdirSync(pasta, {recursive: true});
// se a qualidade ou a duração mudaram desde a última tentativa, os pedaços antigos não servem
const assinatura = JSON.stringify({id, total, nomeQ, props: inputProps, T});
const arqAss = path.join(pasta, 'assinatura.json');
if (fs.existsSync(arqAss) && fs.readFileSync(arqAss, 'utf8') !== assinatura) {
  for (const f of fs.readdirSync(pasta)) fs.rmSync(path.join(pasta, f), {force: true});
  console.log('Os pedaços de uma tentativa anterior eram de outra versão: começando do zero.');
}
fs.writeFileSync(arqAss, assinatura);
const blocos = [];
for (let i = 0; i < total; i += T) blocos.push([i, Math.min(total - 1, i + T - 1)]);
const nome = ([a, b]) => path.join(pasta, `q${String(a).padStart(5, '0')}-${String(b).padStart(5, '0')}.mp4`);
const fila = blocos.filter((bl) => !fs.existsSync(nome(bl)));
const prontosAntes = blocos.length - fila.length;
const PARTES = Math.max(1, Number(process.env.PARTES ?? 1));
console.log(`Renderizando ${total} quadros (${(total / composition.fps).toFixed(1)} s) · qualidade ${nomeQ} · ${blocos.length} pedaços${prontosAntes ? ` (${prontosAntes} já prontos)` : ''}`);

const t0 = Date.now();
const feitos = new Map(); // pedaço → quadros feitos agora
const quadrosFila = fila.reduce((s, [a, b]) => s + b - a + 1, 0);
let ultimoAviso = 0;
const mostra = (forcar = false) => {
  const agora = Date.now();
  if (!forcar && agora - ultimoAviso < 20000) return;
  ultimoAviso = agora;
  const q = [...feitos.values()].reduce((s, x) => s + x, 0);
  const seg = (agora - t0) / 1000;
  const ritmo = q / Math.max(1, seg);
  const falta = ritmo > 0 ? (quadrosFila - q) / ritmo : 0;
  const pct = ((prontosAntes * T + q) / total) * 100;
  if (q === 0) return; // ainda abrindo o navegador: sem ritmo para estimar
  const linha = `${Math.min(100, pct).toFixed(0)}% · ${ritmo.toFixed(2)} quadros/s · falta ~${fmt(falta)}`;
  console.log(linha);
  fs.writeFileSync(path.join(pasta, 'progresso.json'), JSON.stringify({pct: Math.round(pct), quadrosPorSegundo: Number(ritmo.toFixed(3)), faltaSegundos: Math.round(falta), atualizado: new Date().toISOString()}));
};
const trabalhador = async () => {
  while (fila.length) {
    const bl = fila.shift();
    const tmp = nome(bl).replace(/\.mp4$/, '.tmp.mp4');
    await renderMedia({
      ...base,
      codec: 'h264',
      crf: 17,
      frameRange: bl,
      muted: true,
      concurrency: ABAS,
      outputLocation: tmp,
      onProgress: ({renderedFrames}) => {
        feitos.set(bl[0], renderedFrames);
        mostra();
      },
    });
    fs.renameSync(tmp, nome(bl)); // só vira pedaço pronto quando terminou inteiro
    feitos.set(bl[0], bl[1] - bl[0] + 1);
    mostra(true);
  }
};
await Promise.all(Array.from({length: PARTES}, trabalhador));

// o áudio sai inteiro de uma vez (juntar áudio em pedaços faz a voz "engasgar" nas emendas)
const lista = path.join(pasta, 'lista.txt');
fs.writeFileSync(lista, blocos.map((bl) => `file '${nome(bl)}'`).join('\n'));
const local = path.join(pasta, 'final.mp4');
if (process.env.SEM_AUDIO === '1') {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', local]);
} else {
  console.log('Juntando os pedaços com o áudio…');
  const audio = path.join(pasta, 'audio.aac');
  await renderMedia({...base, codec: 'aac', outputLocation: audio});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-i', audio, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', '-movflags', '+faststart', local]);
}
// Escrever direto no Google Drive corrompe o MP4 (o Drive sincroniza enquanto o arquivo cresce): copia só no fim.
fs.copyFileSync(local, saida);
if (process.env.MANTER_PARTES !== '1') fs.rmSync(pasta, {recursive: true, force: true});
fs.rmSync(publicDir, {recursive: true, force: true});
console.log(`pronto: ${saida} · ${nomeQ} · ${fmt((Date.now() - t0) / 1000)} (memória máxima: ${(pararVigia() / 1024 ** 3).toFixed(1)} GB)`);
