import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {FONTE, MONO, type Tema} from './tema';

// Camada 2D por cima do 3D: pílula de estado, legenda palavra a palavra, etiquetas com linha.
// Medidas pensadas para 1080x1920.

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const mola = Easing.out(Easing.back(2.2));

export const Y_PILULA = 1268;
export const Y_LEGENDA = 1388;

export const Pilula: React.FC<{tema: Tema; estado: string; t: number; troca?: number; y?: number}> = ({tema, estado, t, troca = 0, y = Y_PILULA}) => {
  // Ao trocar de estado, o ponto pisca e o texto sobe 8px.
  const k = interpolate(t - troca, [0, 0.25], [0, 1], clamp);
  const pop = 1 + 0.12 * Math.sin(Math.PI * interpolate(t - troca, [0, 0.32], [0, 1], clamp));
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: y,
        transform: `scale(${pop})`,
        transformOrigin: 'left center',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '14px 30px 14px 16px',
        borderRadius: 999,
        background: tema.pilulaFundo,
        boxShadow: tema.nome === 'creme' ? '0 6px 24px rgba(30,29,27,0.18)' : '0 0 0 1.5px rgba(200,208,218,0.18)',
      }}
    >
      <div style={{width: 40, height: 40, borderRadius: 20, background: tema.pilulaTexto}} />
      <div style={{width: 12, height: 12, borderRadius: 6, background: tema.acento, opacity: 0.4 + 0.6 * k}} />
      <div
        style={{
          fontFamily: MONO,
          fontSize: 32,
          letterSpacing: 4,
          fontWeight: 600,
          color: tema.pilulaTexto,
          transform: `translateY(${(1 - k) * 8}px)`,
          opacity: k,
        }}
      >
        {estado}
      </div>
    </div>
  );
};

// Legenda: só uma frase curta por vez; palavras já ditas ficam acesas, as que vêm ficam apagadas.
export const Legenda: React.FC<{tema: Tema; palavras: {w: string; s: number}[]; t: number}> = ({tema, palavras, t}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: Y_LEGENDA, display: 'flex', justifyContent: 'center'}}>
    <div
      style={{
        maxWidth: 900,
        padding: '18px 30px',
        borderRadius: 18,
        background: tema.legendaFundo,
        fontFamily: FONTE,
        fontSize: 52,
        fontWeight: 600,
        letterSpacing: -0.5,
        lineHeight: 1.18,
        textAlign: 'center',
      }}
    >
      {palavras.map((p, i) => (
        <span key={i} style={{color: t >= p.s ? tema.legendaAceso : tema.legendaApagado}}>
          {p.w}
          {i < palavras.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>
  </div>
);

// Distribui as palavras de uma frase ao longo de um intervalo (só para os quadros de estilo; no vídeo vem do palavras.json).
export const espalhar = (frase: string, ini: number, fim: number) => {
  const ws = frase.split(' ');
  return ws.map((w, i) => ({w, s: ini + ((fim - ini) * i) / ws.length}));
};

// Etiqueta fina com linha até um ponto da cena (ponto já projetado em pixels).
export const Etiqueta: React.FC<{
  tema: Tema;
  x: number;
  y: number;
  alvo: {x: number; y: number};
  titulo: string;
  sub?: string;
  aparece: number; // 0..1
  destaque?: boolean;
}> = ({tema, x, y, alvo, titulo, sub, aparece, destaque}) => {
  const borda = destaque ? tema.acento : tema.nome === 'creme' ? 'rgba(30,29,27,0.55)' : 'rgba(200,208,218,0.45)';
  const ancora = {x: x + 26, y: y + 30};
  // A linha sai do objeto e chega na caixa; a caixa salta com mola.
  const linha = interpolate(aparece, [0, 0.55], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const caixa = interpolate(aparece, [0.3, 1], [0, 1], {...clamp, easing: mola});
  const caixaOp = interpolate(aparece, [0.3, 0.55], [0, 1], clamp);
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'visible'}}>
        <line
          x1={alvo.x}
          y1={alvo.y}
          x2={alvo.x + (ancora.x - alvo.x) * linha}
          y2={alvo.y + (ancora.y - alvo.y) * linha}
          stroke={borda}
          strokeWidth={2.5}
          opacity={aparece > 0 ? 1 : 0}
        />
        <circle cx={alvo.x} cy={alvo.y} r={7 * Math.min(1, aparece * 4)} fill={destaque ? tema.acento : tema.etiquetaTexto} />
        {aparece > 0 && aparece < 1 ? <circle cx={alvo.x} cy={alvo.y} r={7 + aparece * 30} fill="none" stroke={destaque ? tema.acento : tema.etiquetaTexto} strokeWidth={2} opacity={1 - aparece} /> : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          padding: '14px 26px 14px 22px',
          borderRadius: 12,
          border: `2.5px solid ${borda}`,
          background: tema.etiquetaFundo,
          opacity: caixaOp,
          transform: `scale(${0.6 + 0.4 * caixa})`,
          transformOrigin: 'left center',
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <div style={{marginTop: 14, width: 10, height: 10, borderRadius: 5, border: `2.5px solid ${destaque ? tema.acento : tema.etiquetaTexto}`}} />
        <div>
          <div style={{fontFamily: FONTE, fontSize: 36, fontWeight: 650, color: tema.etiquetaTexto, letterSpacing: -0.3}}>{titulo}</div>
          {sub ? <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 2.5, color: tema.etiquetaSub, marginTop: 4}}>{sub}</div> : null}
        </div>
      </div>
    </>
  );
};

// Cartão "tela do celular" (o equivalente à seta do AirTag no vídeo de referência).
export const CartaoPix: React.FC<{
  tema: Tema;
  x: number;
  y: number;
  aparece: number;
  digitado: number;
  nome?: string;
  nomeAparece?: number;
  cpfAparece?: number;
  destaqueNome?: number;
  confirmado?: number;
  escala?: number;
}> = ({tema, x, y, aparece, digitado, nome, nomeAparece = 0, cpfAparece, destaqueNome = 0, confirmado = 0, escala = 1}) => {
  const chave = '(11) 98765-4321';
  const n = Math.round(chave.length * digitado);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 400,
        borderRadius: 34,
        padding: '30px 28px 34px',
        background: '#121212',
        border: '6px solid #2A2A2A',
        boxShadow: '0 30px 60px rgba(0,0,0,0.25)',
        opacity: aparece,
        transform: `translateY(${(1 - aparece) * 30}px) scale(${(0.94 + 0.06 * aparece) * escala})`,
        transformOrigin: 'top left',
        fontFamily: FONTE,
        color: '#F4F4F4',
      }}
    >
      <div style={{fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: '#8A8A8A'}}>PAGAR COM PIX</div>
      <div style={{fontSize: 30, fontWeight: 700, marginTop: 6}}>Chave</div>
      <div style={{marginTop: 18, padding: '14px 16px', borderRadius: 12, background: '#1F1F1F', fontSize: 30, fontWeight: 600, letterSpacing: 0.5, minHeight: 40, whiteSpace: 'nowrap'}}>
        {chave.slice(0, n)}
        <span style={{color: tema.acento}}>{digitado < 1 ? '|' : ''}</span>
      </div>
      <div style={{marginTop: 18, height: 74}}>
        <div style={{fontSize: 30, fontWeight: 700, opacity: nomeAparece, display: 'inline-block', borderBottom: `4px solid ${tema.acento}`, borderBottomColor: destaqueNome > 0 ? tema.acento : 'transparent', paddingBottom: 2}}>{nome}</div>
        <div style={{fontFamily: MONO, fontSize: 18, color: '#8A8A8A', marginTop: 6, opacity: cpfAparece ?? nomeAparece}}>***.456.789-** · BANCO B</div>
      </div>
      <div style={{marginTop: 8, fontSize: 64, fontWeight: 750, letterSpacing: -1.5}}>R$ 12,00</div>
      <div
        style={{
          marginTop: 18,
          height: 64,
          borderRadius: 32,
          background: confirmado > 0.5 ? '#F4F4F4' : tema.acento,
          transform: `scale(${1 - 0.06 * Math.sin(Math.PI * Math.min(1, confirmado * 2))})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 700,
          color: '#121212',
        }}
      >
        {confirmado > 0.5 ? 'Confirmado ✓' : 'Confirmar'}
      </div>
    </div>
  );
};

export const Marca: React.FC<{tema: Tema}> = ({tema}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div
      style={{
        position: 'absolute',
        top: 150,
        left: 64,
        fontFamily: MONO,
        fontSize: 24,
        letterSpacing: 6,
        color: tema.nome === 'creme' ? 'rgba(30,29,27,0.55)' : 'rgba(231,235,240,0.5)',
      }}
    >
      COMO FUNCIONA · PIX
    </div>
  </AbsoluteFill>
);

// Estouro de pontinhos saindo de um ponto (confirmação, chegada do dinheiro).
export const Estouro: React.FC<{x: number; y: number; k: number; cor: string; n?: number; raio?: number}> = ({x, y, k, cor, n = 12, raio = 130}) => {
  if (k <= 0 || k >= 1) return null;
  const e = 1 - Math.pow(1 - k, 3);
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'visible', pointerEvents: 'none'}}>
      {Array.from({length: n}).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.3;
        const r = raio * e * (i % 2 === 0 ? 1 : 0.72);
        return <circle key={i} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r} r={(i % 2 === 0 ? 9 : 6) * (1 - k * 0.6)} fill={cor} opacity={1 - k} />;
      })}
    </svg>
  );
};

// Ondas concêntricas (vibração do celular, sinal chegando).
export const Ondas: React.FC<{x: number; y: number; t: number; ini: number; cor: string; vezes?: number}> = ({x, y, t, ini, cor, vezes = 3}) => (
  <svg style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'visible', pointerEvents: 'none'}}>
    {Array.from({length: vezes}).map((_, i) => {
      const k = (t - ini - i * 0.22) / 0.8;
      if (k <= 0 || k >= 1) return null;
      return <circle key={i} cx={x} cy={y} r={20 + k * 110} fill="none" stroke={cor} strokeWidth={4 * (1 - k) + 1} opacity={1 - k} />;
    })}
  </svg>
);
