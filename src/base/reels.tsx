import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONTE} from './tema';

// Área segura do Reels (1080×1920): fora dela, a interface do Instagram cobre a imagem.
export const SEGURO = {topo: 270, base: 1248, esq: 65, dir: 1015, botoesX: 940, botoesY: 1040};
// Base (y) da caixa da legenda: logo acima do nome do perfil, deixando o centro da imagem livre.
// Mantenha objetos 3D e etiquetas fora da faixa y ≈ 1430–1525.
export const LEGENDA_BAIXO = 1525;

// Sobreposição de conferência (composições *Guia): pinta de vermelho o que a interface do Reels cobre.
export const GuiaReels: React.FC = () => {
  const {topo, base, esq, dir, botoesX, botoesY} = SEGURO;
  const veu = 'rgba(255,40,40,0.28)';
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: topo, background: veu}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: base, bottom: 0, background: veu}} />
      <div style={{position: 'absolute', left: 0, width: esq, top: topo, height: base - topo, background: veu}} />
      <div style={{position: 'absolute', left: dir, right: 0, top: topo, height: base - topo, background: veu}} />
      <div style={{position: 'absolute', left: botoesX, right: 0, top: botoesY, height: base - botoesY, background: veu}} />
      <div style={{position: 'absolute', left: esq, top: topo, width: dir - esq, height: base - topo, border: '3px dashed #00E0FF'}} />
      <div style={{position: 'absolute', left: 48, top: 120, fontFamily: FONTE, fontWeight: 800, fontSize: 58, color: '#fff'}}>Reels</div>
      {[1150, 1290, 1420, 1545, 1665].map((y) => (
        <div key={y} style={{position: 'absolute', left: 985, top: y, width: 66, height: 66, borderRadius: 33, border: '6px solid #fff'}} />
      ))}
      <div style={{position: 'absolute', left: 40, top: 1590, width: 80, height: 80, borderRadius: 40, background: '#fff'}} />
      <div style={{position: 'absolute', left: 140, top: 1610, width: 360, height: 38, borderRadius: 10, background: '#fff'}} />
      <div style={{position: 'absolute', left: 40, top: 1700, width: 760, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.85)'}} />
      <div style={{position: 'absolute', left: 40, top: 1760, width: 520, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.7)'}} />
    </AbsoluteFill>
  );
};
