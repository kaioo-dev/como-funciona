import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {ESTILOS, FONTE, MONO} from './tema';
import {MEU_ESTILO} from '../estilo';
import {SERIE} from './ativo';

// "#RRGGBB" → "r,g,b" (para o véu em degradê).
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');

// Capa de Reels: fundo 3D limpo + título. O texto fica dentro da faixa central 3:4 (o recorte da grade do perfil).
// `tema` = nome do assunto (vira "SÉRIE · TEMA"); `destaque` = índice da linha na cor de acento.
export const Capa: React.FC<{fundo: string; tema: string; linhas: string[]; destaque: number; desce?: number; estilo?: string}> = ({fundo, tema: assunto, linhas, destaque, desce = 0, estilo}) => {
  const tm = (estilo && ESTILOS[estilo]) || MEU_ESTILO;
  const veu = rgb(tm.fundo);
  return (
    <AbsoluteFill style={{background: tm.fundo}}>
      <Img src={staticFile(fundo)} style={{width: 1080, height: 1920, objectFit: 'cover', transform: `translateY(${desce}px) scale(${1 + desce / 1920})`, transformOrigin: 'bottom center'}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(${veu},0.97) 0%, rgba(${veu},0.92) 34%, rgba(${veu},0) 50%)`}} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 300}}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 26px 12px 14px', borderRadius: 999, background: tm.pilulaFundo, border: `2px solid ${tm.cartaoBorda}`}}>
          <div style={{width: 34, height: 34, borderRadius: 17, background: tm.pilulaTexto}} />
          <div style={{width: 12, height: 12, borderRadius: 6, background: tm.acento}} />
          <div style={{fontFamily: MONO, fontSize: 30, letterSpacing: 5, color: tm.pilulaTexto, fontWeight: 600}}>
            {SERIE ? `${SERIE} · ${assunto}` : assunto}
          </div>
        </div>
        <div style={{marginTop: 34, fontFamily: FONTE, fontWeight: 850, fontSize: 104, lineHeight: 1.0, letterSpacing: -4}}>
          {linhas.map((l, i) => (
            <div key={i} style={{color: i === destaque ? tm.acento : tm.texto}}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
