// Renderiza uma composição inteira em MP4 (h264), sem copiar os GBs de projetos/ para o bundle.
// Uso: node scripts/render.mjs <Composicao> <saida.mp4> [quadroInicial-quadroFinal]
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {vigiarMemoria} from './memoria.mjs';
import {renderMedia, selectComposition} from '@remotion/renderer';

const [id, saida, faixa] = process.argv.slice(2);
if (!id || !saida) {
  console.error('Uso: node scripts/render.mjs <Composicao> <saida.mp4>');
  process.exit(1);
}
// v1.2: o texto de fábrica "SUA SÉRIE" nunca vai para um vídeo final. Escolha a série (skill `estilo`)
// ou deixe vazio (SERIE = '') para o topo mostrar só o assunto.
const estilo = fs.readFileSync('src/estilo.ts', 'utf8');
if (/SERIE\s*=\s*['"]SUA SÉRIE['"]/.test(estilo) && !/(Guia|Limpo|^Capa|Teste|Exemplo|^Overbooking)/.test(id)) {
  console.error('PARE: src/estilo.ts ainda tem SERIE = \'SUA SÉRIE\'. Use a skill `estilo` para escolher o nome da série (ou SERIE = \'\').');
  process.exit(1);
}

// Pasta pública feita só de links (o bundle copia links como links); veja scripts/stills.mjs.
const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-public-'));
for (const nome of fs.readdirSync('projetos')) {
  fs.symlinkSync(path.resolve('projetos', nome), path.join(publicDir, nome));
}
// ENTRADA permite renderizar só um projeto (evita carregar fontes e assets dos outros vídeos).
const pararVigia = vigiarMemoria('render');
const serveUrl = await bundle({entryPoint: path.resolve(process.env.ENTRADA ?? 'src/index.ts'), publicDir});

const navegador = path.join(os.homedir(), 'Library/Caches/remotion-browser/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browserExecutable = fs.existsSync(navegador) ? navegador : null;
// Cenas com Three.js precisam de GPU no navegador headless: GL=angle node scripts/...
const chromiumOptions = process.env.GL ? {gl: process.env.GL} : {};

// PROPS='{"estilo":"lavanda"}' troca as opções da composição (ex.: prévia de outro estilo).
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 120000});
fs.mkdirSync(path.dirname(saida), {recursive: true});
// Escrever direto no Google Drive corrompe o MP4 (o Drive sincroniza enquanto o arquivo cresce).
// Renderiza numa pasta local e só copia o arquivo pronto.
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-render-'));
const local = path.join(pasta, path.basename(saida));
// PARTES=4: renderiza 4 pedaços ao mesmo tempo (um navegador cada), junta e põe o áudio uma vez só.
// Bem mais rápido em computador com vários núcleos. Cada pedaço continua com 1 aba (sem tremer).
// Padrão: ajustado ao computador (1 parte a cada 3 núcleos, no máximo 4; com menos de 12 GB de memória, no máximo 2).
// Com placa de vídeo (GL=angle) 1 parte já é rápida (~10–15 quadros/s num Mac com chip M) e deixa o computador usável;
// várias partes só disputam a placa e a memória. Sem placa de vídeo (servidor), dividir ajuda.
const auto = process.env.GL ? 1 : Math.max(1, Math.min(4, Math.floor(os.cpus().length / 3), os.totalmem() < 12e9 ? 2 : 4));
const PARTES = faixa ? 1 : Math.max(1, Number(process.env.PARTES ?? auto));
console.log(`Renderizando em ${PARTES} parte(s) ao mesmo tempo…`);
const base = {inputProps, serveUrl, composition, timeoutInMilliseconds: 120000, browserExecutable, chromiumOptions};
const progresso = new Array(PARTES).fill(0);
let ultimo = -1;
const mostra = () => {
  const p = Math.floor((progresso.reduce((a, b) => a + b, 0) / PARTES) * 20) * 5;
  if (p !== ultimo) {
    ultimo = p;
    console.log(`${p}%`);
  }
};
if (PARTES === 1) {
  await renderMedia({
    ...base,
    codec: 'h264',
    frameRange: faixa ? faixa.split('-').map(Number) : null,
    crf: 17,
    // SEM_AUDIO=1: só imagem.
    muted: process.env.SEM_AUDIO === '1',
    // Cenas 3D com pós-processamento precisam de 1 aba (padrão): em abas paralelas os quadros saem fora de fase e a imagem treme.
    concurrency: Number(process.env.ABAS ?? 1),
    outputLocation: local,
    onProgress: ({progress}) => {
      progresso[0] = progress;
      mostra();
    },
  });
} else {
  const total = composition.durationInFrames;
  const tam = Math.ceil(total / PARTES);
  const arquivos = [];
  await Promise.all(
    Array.from({length: PARTES}, (_, i) => {
      const ini = i * tam;
      const fim = Math.min(total - 1, ini + tam - 1);
      const arq = path.join(pasta, `parte${i}.mp4`);
      arquivos.push(arq);
      return renderMedia({...base, codec: 'h264', frameRange: [ini, fim], crf: 17, muted: true, concurrency: 1, outputLocation: arq, onProgress: ({progress}) => {
        progresso[i] = progress;
        mostra();
      }});
    }),
  );
  // o áudio sai inteiro de uma vez (juntar áudio em pedaços faz a voz "engasgar" nas emendas)
  const audio = path.join(pasta, 'audio.aac');
  await renderMedia({...base, codec: 'aac', outputLocation: audio});
  const lista = path.join(pasta, 'lista.txt');
  fs.writeFileSync(lista, arquivos.map((f) => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-i', audio, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', '-movflags', '+faststart', local]);
}
fs.copyFileSync(local, saida);
fs.rmSync(pasta, {recursive: true, force: true});
console.log(`pronto: ${saida}  (memória máxima: ${(pararVigia() / 1024 ** 3).toFixed(1)} GB)`);
