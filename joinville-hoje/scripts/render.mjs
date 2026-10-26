// Renderiza o boletim de um dia em MP4.
// Uso: node scripts/render.mjs <AAAA-MM-DD> [saida.mp4]      (padrão: edicoes/<AAAA-MM-DD>/joinville-hoje-<AAAA-MM-DD>.mp4)
// Quadro solto para conferir: node scripts/render.mjs <AAAA-MM-DD> --quadros 0,150,600  (gera JPGs em projetos/<data>/revisao/)
// É tudo 2D (sem 3D): renderiza rápido mesmo em computador ou servidor sem placa de vídeo.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const [dia, ...resto] = process.argv.slice(2);
if (!dia) {
  console.error('Uso: node scripts/render.mjs <AAAA-MM-DD> [saida.mp4] [--quadros 0,150]');
  process.exit(1);
}
const arq = path.join('projetos', dia, 'edicao.json');
const edicao = JSON.parse(fs.readFileSync(arq, 'utf8'));
if (JSON.stringify(edicao).includes('PREENCHER')) {
  console.error(`PARE: ${arq} ainda tem PREENCHER. Complete pela apuração (skill apuracao) ou apague o bloco.`);
  process.exit(1);
}
// narração e palavras: se existirem no projeto, entram sozinhas
const pasta = path.join('projetos', dia);
if (!edicao.narracao && fs.existsSync(path.join(pasta, 'audio', 'narracao-norm.wav'))) edicao.narracao = 'audio/narracao-norm.wav';
if (!edicao.palavras && fs.existsSync(path.join(pasta, 'palavras.json'))) edicao.palavras = JSON.parse(fs.readFileSync(path.join(pasta, 'palavras.json'), 'utf8'));
if (edicao.trilha === undefined && fs.existsSync(path.join(pasta, 'sfx', 'trilha.wav'))) edicao.trilha = 'sfx/trilha.wav';
if (!edicao.narracao) console.log('Aviso: sem narração (audio/narracao-norm.wav) — vídeo mudo, com tempo estimado (serve como prévia).');

const iq = resto.indexOf('--quadros');
const quadros = iq >= 0 ? resto[iq + 1].split(',').map(Number) : null;
const saida = resto.find((x, i) => !x.startsWith('--') && (iq < 0 || i !== iq + 1)) ?? path.join('edicoes', dia, `joinville-hoje-${dia}.mp4`);

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('projetos')});
const inputProps = {edicao};
const composition = await selectComposition({serveUrl, id: quadros ? 'BoletimGuia' : 'Boletim', inputProps, timeoutInMilliseconds: 120000});
if (quadros) {
  const dir = path.join(pasta, 'revisao');
  fs.mkdirSync(dir, {recursive: true});
  for (const q of quadros) {
    const out = path.join(dir, `q${String(q).padStart(5, '0')}.jpg`);
    await renderStill({serveUrl, composition, inputProps, frame: Math.min(q, composition.durationInFrames - 1), output: out, imageFormat: 'jpeg', jpegQuality: 88});
    console.log(out);
  }
  process.exit(0);
}
fs.mkdirSync(path.dirname(saida), {recursive: true});
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jh-')), 'v.mp4');
let ultimo = -1;
await renderMedia({
  serveUrl,
  composition,
  inputProps,
  codec: 'h264',
  crf: 18,
  concurrency: Math.max(1, Math.min(4, os.cpus().length - 1)),
  outputLocation: tmp,
  timeoutInMilliseconds: 120000,
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 10) * 10;
    if (p !== ultimo) {
      ultimo = p;
      console.log(`${p}%`);
    }
  },
});
fs.copyFileSync(tmp, saida);
console.log(`pronto: ${saida} (${(composition.durationInFrames / composition.fps).toFixed(1)} s)`);
