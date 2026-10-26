// Tudo da biblioteca num import só (v1.2):
//   import {VideoKit, CanvasCinema, camera, cantos, Entra, Rastro, Chip, ...} from '../../base/kit';
export * from './video';
export * from './camera';
export * from './ui';
export * from './entradas';
export * from './diagramas';
export {TEMA, SERIE, CORES, paleta} from './ativo';
export {Caixa, Boneco, Placa, Moeda, Pilhas, Celular, Onda, Vapor, Particulas, Fosco, geoCaixa, ikBraco, ALCANCE_BRACO, type Pose, type V3, type Cam, type Foco} from './pecas';
export {Material, type TipoMaterial} from './materiais';
export {Solido, Efeito, useQuadro} from './qa';
export {andar, pular, queda, separar, mola, topo, type Superficie} from './movimento';
export {SEGURO, LEGENDA_BAIXO} from './reels';
export {Easing} from 'remotion';
