// O estilo e a série em uso NESTE render (v1.2).
// Vem de src/estilo.ts; a prévia de estilos troca por PROPS='{"estilo":"lavanda"}' sem mexer em nada.
// Tudo da biblioteca usa `TEMA` como padrão: o vídeo não precisa passar `tema` para cada peça.
import * as THREE from 'three';
import {getInputProps} from 'remotion';
import {ESTILOS, type Tema} from './tema';
import {MEU_ESTILO, SERIE as SERIE_ESCOLHIDA} from '../estilo';

const props = (() => {
  try {
    return getInputProps() as {estilo?: string};
  } catch {
    return {} as {estilo?: string};
  }
})();
export const TEMA: Tema = (props.estilo && ESTILOS[props.estilo]) || MEU_ESTILO;
// 'SUA SÉRIE' é o texto de fábrica: nunca aparece no vídeo (fica só o assunto) e o render recusa até a pessoa escolher.
export const SERIE_PADRAO = 'SUA SÉRIE';
export const SERIE: string = SERIE_ESCOLHIDA.trim() === SERIE_PADRAO ? '' : SERIE_ESCOLHIDA.trim();

const mistura = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();

// Paleta de neutros derivada do tema (o "chumbo" do canal no estilo escuro; tons de papel no creme).
// Regra: o mundo em neutros, UM acento no que importa. Use estes nomes em vez de cores fixas.
export const paleta = (tema: Tema = TEMA) => {
  const acento = new THREE.Color(tema.acento);
  return {
    fundo: tema.fundo,
    escuro: tema.branco, // base de móveis, bancadas, carcaças (o tom mais fundo dos objetos)
    medio: mistura(tema.branco, tema.corpo, 0.55), // corpo dos objetos ("chumbo")
    cinza: mistura(tema.corpo, tema.objeto, 0.25), // detalhes, botões, peças secundárias
    claro: mistura(tema.corpo, tema.objeto, 0.8), // o que precisa saltar sem ser o acento (prato, papel, peça clara)
    pessoa: tema.pessoa,
    acento: tema.acento,
    // cor "acesa" (HDR) para pontos de energia, ondas e fios: brilha no bloom sem estourar o resto
    brilho: new THREE.Color(acento.r * 2.8, acento.g * 2.4, acento.b * 2.0),
    linha: tema.linha,
  };
};
export const CORES = paleta(TEMA);
