// O mapa de Joinville (bairros, contorno da cidade e Rio Cachoeira), desenhado em SVG a partir dos dados do
// OpenStreetMap. A "câmera" é um retângulo em longitude/latitude: o mapa enquadra esse retângulo e desliza suave de
// um enquadramento para o outro na troca de bloco. Pins e bairros acesos mostram ONDE está cada informação.
import React from 'react';
import {interpolate, Easing} from 'remotion';
import {BAIRROS, CIDADE, RIO, type Ponto} from '../mapa/dados';
import {COR, FONTE, MONO} from '../estilo';

export type Caixa = {lon: [number, number]; lat: [number, number]};
export const AREA = {x: 65, y: 360, w: 950, h: 650}; // onde o mapa fica na tela
const LAT0 = -26.3;
const KX = Math.cos((LAT0 * Math.PI) / 180);

// enquadramentos prontos
export const CIDADE_URBANA: Caixa = {lon: [-48.95, -48.76], lat: [-26.4, -26.15]};
export const CENTRO: Caixa = {lon: [-48.875, -48.815], lat: [-26.33, -26.27]};
export const LESTE: Caixa = {lon: [-48.86, -48.75], lat: [-26.37, -26.22]}; // perto da baía
export const caixaDosBairros = (nomes: string[], folga = 0.012): Caixa => {
  const bs = BAIRROS.filter((b) => nomes.includes(b.nome));
  if (!bs.length) return CIDADE_URBANA;
  const pts = bs.flatMap((b) => b.aneis.flat());
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return {lon: [Math.min(...lons) - folga, Math.max(...lons) + folga], lat: [Math.min(...lats) - folga, Math.max(...lats) + folga]};
};

// projeção: a caixa ocupa a faixa `janela` (y, altura) da área do mapa sem distorcer (equiretangular corrigida pela
// latitude). Com cartão por cima da parte de baixo, a janela é só a parte de cima: o assunto não fica tapado.
export type Janela = {y: number; h: number};
export const JANELA_CHEIA: Janela = {y: AREA.y, h: AREA.h};
export const JANELA_TOPO: Janela = {y: AREA.y + 10, h: 400};
const projetor = (c: Caixa, j: Janela) => {
  const lw = (c.lon[1] - c.lon[0]) * KX;
  const lh = c.lat[1] - c.lat[0];
  const s = Math.min((AREA.w - 40) / lw, (j.h - 20) / lh);
  const cx = (c.lon[0] + c.lon[1]) / 2;
  const cy = (c.lat[0] + c.lat[1]) / 2;
  return (p: Ponto): [number, number] => [AREA.x + AREA.w / 2 + (p[0] - cx) * KX * s, j.y + j.h / 2 - (p[1] - cy) * s];
};
const mistura = (a: Caixa, b: Caixa, k: number): Caixa => {
  const l = (x: number, y: number) => x + (y - x) * k;
  return {lon: [l(a.lon[0], b.lon[0]), l(a.lon[1], b.lon[1])], lat: [l(a.lat[0], b.lat[0]), l(a.lat[1], b.lat[1])]};
};
const caminho = (anel: Ponto[], pj: (p: Ponto) => [number, number], fecha = true) =>
  anel.map((p, i) => {
    const [x, y] = pj(p);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join('') + (fecha ? 'Z' : '');

export type Pin = {bairro: string; rotulo?: string; k: number};

export const Mapa: React.FC<{
  t: number;
  de: Caixa; // enquadramento do bloco anterior
  para: Caixa; // enquadramento deste bloco
  ini: number; // quando este bloco começou (a câmera desliza no começo)
  janelaDe?: Janela;
  janela?: Janela;
  acesos?: string[]; // bairros pintados (alerta, falta de luz…)
  kAcesos?: number;
  pins?: Pin[];
  chuva?: number; // 0..1 intensidade da chuva desenhada sobre o mapa
  rio?: number; // 0..1 destaque do rio
  apagado?: number; // 0..1 esmaece o mapa (quando o cartão é o assunto)
}> = ({t, de, para, ini, janelaDe = JANELA_CHEIA, janela = JANELA_CHEIA, acesos = [], kAcesos = 1, pins = [], chuva = 0, rio = 0, apagado = 0}) => {
  const k = interpolate(t, [ini, ini + 1.1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  // respiração lenta da câmera: o mapa nunca fica parado
  const resp = 0.012 * Math.sin(t * 0.35);
  const base = mistura(de, para, k);
  const cam: Caixa = {lon: [base.lon[0] + resp * 0.01, base.lon[1] - resp * 0.01], lat: [base.lat[0] + resp * 0.01, base.lat[1] - resp * 0.01]};
  const pj = projetor(cam, {y: janelaDe.y + (janela.y - janelaDe.y) * k, h: janelaDe.h + (janela.h - janelaDe.h) * k});
  const opMapa = 1 - 0.55 * apagado;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <clipPath id="areaMapa">
          <rect x={AREA.x} y={AREA.y} width={AREA.w} height={AREA.h} rx={28} />
        </clipPath>
        <radialGradient id="vinheta" cx="50%" cy="45%" r="70%">
          <stop offset="60%" stopColor={COR.fundo} stopOpacity={0} />
          <stop offset="100%" stopColor={COR.fundo} stopOpacity={0.9} />
        </radialGradient>
      </defs>
      <g clipPath="url(#areaMapa)" opacity={opMapa}>
        <rect x={AREA.x} y={AREA.y} width={AREA.w} height={AREA.h} fill={COR.fundo} />
        {CIDADE.map((a, i) => (
          <path key={`c${i}`} d={caminho(a, pj)} fill={COR.fundoAlto} stroke={COR.bairroBorda} strokeWidth={2} />
        ))}
        {BAIRROS.map((b) => {
          const aceso = acesos.includes(b.nome);
          return b.aneis.map((a, i) => (
            <path
              key={`${b.nome}${i}`}
              d={caminho(a, pj)}
              fill={aceso ? COR.acento : COR.bairro}
              fillOpacity={aceso ? 0.22 + 0.5 * kAcesos * (0.85 + 0.15 * Math.sin(t * 1.6)) : 1}
              stroke={aceso ? COR.acento : COR.bairroBorda}
              strokeWidth={aceso ? 3 : 1.4}
            />
          ));
        })}
        {RIO.map((l, i) => (
          <path key={`r${i}`} d={caminho(l, pj, false)} fill="none" stroke={COR.agua} strokeWidth={5 + 4 * rio} strokeLinecap="round" strokeLinejoin="round" opacity={0.85 + 0.15 * rio} />
        ))}
        {chuva > 0.01 ? <Chuva t={t} k={chuva} /> : null}
        <rect x={AREA.x} y={AREA.y} width={AREA.w} height={AREA.h} fill="url(#vinheta)" />
      </g>
      <rect x={AREA.x} y={AREA.y} width={AREA.w} height={AREA.h} rx={28} fill="none" stroke={COR.painelBorda} strokeWidth={2} />
      {pins.map((p, i) => {
        const b = BAIRROS.find((x) => x.nome === p.bairro);
        if (!b || p.k <= 0) return null;
        const [x, y] = pj(b.centro);
        if (x < AREA.x || x > AREA.x + AREA.w || y < AREA.y || y > AREA.y + AREA.h) return null;
        const s = Math.min(1, p.k * 1.4);
        const rot = p.rotulo ?? p.bairro;
        const larg = rot.length * 17 + 36;
        const esq = x + larg + 24 > AREA.x + AREA.w; // rótulo vira para dentro do mapa perto da borda
        return (
          <g key={i} opacity={Math.min(1, p.k * 2)}>
            <circle cx={x} cy={y} r={34 * s} fill={COR.acento} opacity={0.18} />
            <circle cx={x} cy={y - 18 * s} r={14 * s} fill={COR.acento} />
            <path d={`M${x - 10 * s} ${y - 12 * s} L${x} ${y + 4} L${x + 10 * s} ${y - 12 * s}Z`} fill={COR.acento} />
            <g transform={`translate(${esq ? x - larg - 22 : x + 22}, ${y - 52})`} opacity={Math.min(1, Math.max(0, p.k * 2 - 0.6))}>
              <rect width={larg} height={46} rx={23} fill={COR.painel} stroke={COR.acento} strokeWidth={2.5} />
              <text x={larg / 2} y={31} textAnchor="middle" fontFamily={FONTE} fontWeight={750} fontSize={27} fill={COR.texto}>
                {rot}
              </text>
            </g>
          </g>
        );
      })}
      <text x={AREA.x + AREA.w - 16} y={AREA.y + AREA.h - 14} textAnchor="end" fontFamily={MONO} fontSize={15} fill={COR.textoSuave} opacity={0.7}>
        © OpenStreetMap
      </text>
    </svg>
  );
};

// chuva: traços diagonais suaves descendo devagar (determinístico: nada de aleatório por quadro)
const Chuva: React.FC<{t: number; k: number}> = ({t, k}) => {
  const n = Math.round(30 + 90 * k);
  return (
    <g opacity={0.35 + 0.35 * k}>
      {Array.from({length: n}, (_, i) => {
        const fx = ((i * 0.6180339) % 1) * (AREA.w + 120) + AREA.x - 60;
        const v = 0.35 + ((i * 0.37) % 1) * 0.3;
        const fy = AREA.y + (((i * 0.4142 + t * v) % 1) * (AREA.h + 80)) - 40;
        return <line key={i} x1={fx} y1={fy} x2={fx - 10} y2={fy + 28} stroke={COR.texto} strokeWidth={2.2} strokeLinecap="round" opacity={0.6} />;
      })}
    </g>
  );
};
