// Quadros de revisão (v1.2), com um bundle só.
// Uso:
//   node scripts/stills.mjs <Composicao> <pasta> <segundos...>        quadros soltos
//   node scripts/stills.mjs <Composicao> <pasta> --cenas               1 quadro no meio de CADA cena (lista vem do vídeo)
//   node scripts/stills.mjs <Composicao> <pasta> --folha 7-9.5 [fps]   folha de movimento: quadros seguidos (padrão 5 por s)
// Sempre monta também <pasta>/folha.jpg (todos lado a lado) para olhar de uma vez.
// Cenas com Three.js precisam de GPU: GL=angle node scripts/... · PROPS='{"estilo":"lavanda"}' troca as opções.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {vigiarMemoria} from './memoria.mjs';
import {renderStill, selectComposition} from '@remotion/renderer';

const [id, saida, ...resto] = process.argv.slice(2);
if (!id || !saida || resto.length === 0) {
  console.error('Uso: node scripts/stills.mjs <Composicao> <pasta> <segundos...> | --cenas | --folha inicio-fim [fps]');
  process.exit(1);
}
fs.mkdirSync(saida, {recursive: true});
// O bundle copia a pasta pública inteira: montamos uma pasta pública feita só de links para projetos/.
const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-public-'));
for (const nome of fs.readdirSync('projetos')) fs.symlinkSync(path.resolve('projetos', nome), path.join(publicDir, nome));
const pararVigia = vigiarMemoria('quadros de revisão');
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir});
// Navegador fora de pastas sincronizadas (descompactar dentro do Drive trava). Se travar em 0%:
// unzip -o node_modules/.remotion/chrome-headless-shell/*.zip -d ~/Library/Caches/remotion-browser
const navegador = path.join(os.homedir(), 'Library/Caches/remotion-browser/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browserExecutable = fs.existsSync(navegador) ? navegador : null;
const chromiumOptions = process.env.GL ? {gl: process.env.GL} : {};
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 120000});
const fps = composition.fps;
const ultimo = composition.durationInFrames - 1;

let quadros = []; // {q, rotulo}
if (resto[0] === '--cenas') {
  // pede a lista de cenas ao próprio vídeo (o VideoKit a descreve no modo de checagem)
  let lista = null;
  await renderStill({serveUrl, composition, frame: 0, inputProps: {...inputProps, qa: true}, output: path.join(os.tmpdir(), `cenas-${process.pid}.jpg`), imageFormat: 'jpeg', scale: 0.1, browserExecutable, chromiumOptions, logLevel: 'error', timeoutInMilliseconds: 120000,
    onBrowserLog: (log) => {
      const i = (log.text ?? '').indexOf('QA|');
      if (i < 0) return;
      try {
        const d = JSON.parse(log.text.slice(i + 3));
        if (d.tipo === 'video') lista = d.cenas;
      } catch {}
    },
  });
  if (!lista) {
    console.error('Não achei a lista de cenas: o vídeo precisa usar <VideoKit> (src/base/kit). Passe os segundos à mão.');
    process.exit(1);
  }
  lista.forEach((c, i) => {
    const ini = i === 0 ? 0 : c.em;
    const fim = i + 1 < lista.length ? lista[i + 1].em : ultimo / fps;
    quadros.push({q: Math.round(((ini + fim) / 2) * fps), rotulo: `${String(i + 1).padStart(2, '0')} ${c.plano} · ${c.nome}`});
  });
} else if (resto[0] === '--folha') {
  const [a, b] = (resto[1] ?? '').split('-').map(Number);
  const passo = 1 / Number(resto[2] ?? 5);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    console.error('Uso: --folha inicio-fim [quadros por segundo]  (ex.: --folha 7-9.5 5)');
    process.exit(1);
  }
  for (let s = a; s <= b + 1e-6; s += passo) quadros.push({q: Math.round(s * fps), rotulo: `${s.toFixed(1)} s`});
} else quadros = resto.map((s) => ({q: Math.round(Number(s) * fps), rotulo: `${s} s`}));

const feitos = [];
for (const {q, rotulo} of quadros) {
  const frame = Math.min(ultimo, Math.max(0, q));
  const output = path.join(saida, `q${String(frame).padStart(5, '0')}.jpg`);
  await renderStill({inputProps, serveUrl, composition, frame, output, imageFormat: 'jpeg', jpegQuality: 85, browserExecutable, chromiumOptions, timeoutInMilliseconds: 120000});
  feitos.push(output);
  console.log(`${output}  (${rotulo})`);
}
// folha de contato: todos os quadros lado a lado, na ordem
if (feitos.length > 1) {
  const cols = Math.min(6, feitos.length);
  const linhas = Math.ceil(feitos.length / cols);
  const lista = path.join(os.tmpdir(), `folha-${process.pid}.txt`);
  fs.writeFileSync(lista, feitos.map((f) => `file '${path.resolve(f)}'`).join('\n'));
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-vf', `scale=300:-1,tile=${cols}x${linhas}:padding=6:color=black`, '-frames:v', '1', path.join(saida, 'folha.jpg')]);
    console.log(`folha: ${path.join(saida, 'folha.jpg')}`);
  } catch {
    console.log('(sem ffmpeg: a folha não foi montada; abra os quadros um a um)');
  }
}
fs.rmSync(publicDir, {recursive: true, force: true});
