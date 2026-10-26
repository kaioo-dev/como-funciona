// Estúdio do telejornal com o jacaré apresentador — prévia do cenário (3 enquadramentos, 1 s cada).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CanvasCinema, camera, cantos, focar, type V3} from '../../base/kit';
import {Bancada, Estudio as Paredes, Jacare, TELAO, Telao, BANCADA} from './pecas';

export const FPS = 30;
export const QUADROS = 90;
const JACARE: V3 = [0, 0, -0.25];
const BUSTO = {pos: [0, 1.48, -0.15] as V3, args: [0.8, 0.75, 0.7] as V3};

export const EstudioJacare: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const plano = Math.min(2, Math.floor(frame / 30));
  const k = (frame % 30) / 30;
  const alvosAberto = [...cantos([0, 1.1, -0.4], [2.9, 2.2, 1.6]), ...cantos(TELAO.pos, [TELAO.larg, TELAO.alt, 0.1])];
  const cam =
    plano === 0
      ? camera(k, t, {alvos: alvosAberto, de: [16, 8], empurra: 0.08})
      : plano === 1
        ? camera(k, t, {alvos: cantos([0, 1.56, 0.12], [0.62, 0.58, 0.95]), de: [-32, 5], empurra: 0.06})
        : camera(k, t, {alvos: [...cantos(BUSTO.pos, BUSTO.args), ...cantos(TELAO.pos, [TELAO.larg, TELAO.alt, 0.1])], de: [48, 6], empurra: 0.06});
  const pose = {boca: plano === 1 ? 0.55 : 0.3, piscar: 0, cabeca: [0.05, plano === 2 ? 0.25 : plano === 1 ? -0.3 : -0.08, 0] as V3, olhar: [plano === 2 ? 0.5 : 0, 0] as [number, number], bracoD: plano === 2 ? 1 : 0};
  return (
    <CanvasCinema cam={cam} t={t} foco={focar(cam, plano === 0 ? [0, 1.5, -0.2] : BUSTO.pos, plano === 0 ? 3 : 1.4, 2)} sombraArea={4}>
      <Paredes />
      <Telao />
      <Bancada />
      <Jacare pos={JACARE} pose={pose} />
      <pointLight position={[0, 2.6, 1.4]} intensity={6} distance={6} color="#FFF2D8" />
      <pointLight position={[0, BANCADA.y + 0.4, -2.2]} intensity={2.5} distance={3} color="#7FB6D6" />
    </CanvasCinema>
  );
};
