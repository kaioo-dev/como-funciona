// A linha do tempo do boletim: quando cada bloco começa e acaba, e o tempo de cada palavra da legenda.
// Com narração, tudo vem das palavras (o elemento aparece quando a palavra é dita). Sem narração (prévia), estima
// pelo tamanho da fala (~2,7 palavras por segundo).
import type {Edicao, Palavra} from './tipos';

export const FPS = 30;
const RITMO = 2.7; // palavras por segundo (narração já acelerada)
const RESPIRO = 0.35; // pausa entre blocos na estimativa
const FIM = 1.6; // respiro depois da última palavra

const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

export type Faixa = {ini: number; fim: number};

// palavras estimadas a partir das falas (quando ainda não há narração)
const estimar = (edicao: Edicao): Palavra[] => {
  const out: Palavra[] = [];
  let t = 0.4;
  for (const b of edicao.blocos) {
    for (const w of b.fala.split(/\s+/).filter(Boolean)) {
      const d = Math.max(0.18, Math.min(0.7, (w.length / 6) * (1 / RITMO) * 1.6));
      out.push({w, s: t, e: t + d * 0.92});
      t += d;
    }
    t += RESPIRO;
  }
  return out;
};

export const linhaDoTempo = (edicao: Edicao) => {
  const palavras = edicao.palavras?.length ? edicao.palavras : estimar(edicao);
  const N = palavras.map((p) => norm(p.w));
  // início de cada bloco = a 1ª palavra da fala dele, procurada em ordem (depois do bloco anterior)
  const inicios: number[] = [];
  let cursor = 0;
  edicao.blocos.forEach((b, k) => {
    const alvo = b.fala.split(/\s+/).map(norm).filter(Boolean).slice(0, 3);
    let achou = -1;
    for (let i = cursor; i <= N.length - alvo.length; i++) {
      if (alvo.every((a, j) => N[i + j] === a)) {
        achou = i;
        break;
      }
    }
    if (achou < 0) throw new Error(`Bloco ${k + 1} (${b.tipo}): o começo da fala "${alvo.join(' ')}" não está nas palavras da narração. Confira o edicao.json.`);
    inicios.push(k === 0 ? 0 : palavras[achou].s - 0.15);
    cursor = achou + alvo.length;
  });
  const total = palavras[palavras.length - 1].e + FIM;
  const faixas: Faixa[] = inicios.map((ini, k) => ({ini, fim: k + 1 < inicios.length ? inicios[k + 1] : total}));
  return {palavras, faixas, total, quadros: Math.ceil(total * FPS)};
};
