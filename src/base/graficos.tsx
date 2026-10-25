import React from 'react';
import {Caixa, type V3} from './pecas';

// Barra 3D de gráfico. `alt` em unidades de cena; `sai` (0→1) afunda a barra no chão.
export const Barra: React.FC<{pos: V3; alt: number; larg?: number; cor?: string; sai?: number}> = ({pos, alt, larg = 1.4, cor = '#6F7A89', sai = 0}) => {
  if (alt < 0.04) return null;
  const h = alt;
  return (
    <group position={[pos[0], pos[1] - sai * (h + 0.2), pos[2]]}>
      <Caixa args={[larg, h, larg]} raio={Math.min(0.12, h / 2.2)} cor={cor} position={[0, h / 2, 0]} />
    </group>
  );
};
