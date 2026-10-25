// Interface do vídeo (v1.2): tudo o que é 2D por cima do 3D, no padrão do canal, já preso na área segura do Reels.
// Os elementos entram por `k` (0 → 1, use rampa(t, T.x, T.x + 0.3)) e nunca saem da área segura.
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONTE, MONO, type Tema} from './tema';
import {SEGURO, LEGENDA_BAIXO} from './reels';
import {TEMA, SERIE} from './ativo';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const sai = Easing.out(Easing.cubic);
const c01 = (x: number) => Math.min(1, Math.max(0, x));

// ---------- Faixas da tela (1080×1920) ----------
export const Y_MARCA = SEGURO.topo + 18; // "SÉRIE · ASSUNTO"
export const Y_PILULA = SEGURO.topo + 62; // pílula de estado
export const Y_TOPO = 440; // linha de chips
export const Y_CARIMBO = Y_TOPO + 110; // carimbo (a virada)
export const Y_BAIXO = 1150; // carimbo/chip de baixo (acima da legenda)
export const ETIQUETA_MIN = Y_TOPO + 90; // etiquetas ficam entre estas duas alturas
export const ETIQUETA_MAX = LEGENDA_BAIXO - 400;

// ---------- Tempo pelas palavras ----------
export type Palavra = {w: string; s: number; e: number};
const norm = (w: string) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
// quando('trecho') = início do trecho na fala. ESTRITO (v1.2): se o trecho aparece mais de uma vez, dá erro e mostra
// onde; aí use um trecho maior (mais palavras) ou quando('trecho', 2) para a 2ª vez. Nunca troque por um número.
// quando.fim('trecho') = fim da última palavra do trecho.
export const criaQuando = (PALAVRAS: Palavra[]) => {
  const NORM = PALAVRAS.map((p) => norm(p.w));
  const achar = (trecho: string, n?: number) => {
    const alvo = trecho.split(/\s+/).map(norm).filter(Boolean);
    if (!alvo.length) throw new Error(`quando(): trecho vazio`);
    const achados: number[] = [];
    for (let i = 0; i <= NORM.length - alvo.length; i++) if (alvo.every((a, k) => NORM[i + k] === a)) achados.push(i);
    const contexto = (i: number) => PALAVRAS.slice(Math.max(0, i - 3), i + alvo.length + 3).map((p) => p.w).join(' ');
    if (!achados.length) throw new Error(`quando('${trecho}'): esse trecho não está na fala. Copie as palavras exatas do palavras.ts.`);
    if (n === undefined && achados.length > 1)
      throw new Error(`quando('${trecho}'): aparece ${achados.length} vezes na fala (${achados.map((i, k) => `${k + 1}ª: "…${contexto(i)}…" em ${PALAVRAS[i].s.toFixed(2)} s`).join('; ')}). Use um trecho maior ou quando('${trecho}', n).`);
    const i = achados[(n ?? 1) - 1];
    if (i === undefined) throw new Error(`quando('${trecho}', ${n}): só aparece ${achados.length} vez(es).`);
    return {i, len: alvo.length};
  };
  const quando = (trecho: string, n?: number) => PALAVRAS[achar(trecho, n).i].s;
  quando.fim = (trecho: string, n?: number) => {
    const r = achar(trecho, n);
    return PALAVRAS[r.i + r.len - 1].e;
  };
  return quando;
};
export const rampa = (t: number, a: number, b: number, easing: (x: number) => number = Easing.bezier(0.45, 0, 0.2, 1)) => interpolate(t, [a, b], [0, 1], {...clamp, easing});
// entra em `a`, sai em `b` (os dois suaves): ótimo para chips que valem só durante uma frase
export const janela = (t: number, a: number, b: number, entra = 0.3, sai2 = 0.3) => rampa(t, a, a + entra, Easing.out(Easing.cubic)) * (1 - rampa(t, b - sai2, b));

// ---------- Legenda do narrador (obrigatória, padrão do canal) ----------
export const criaLegenda = (PALAVRAS: Palavra[], tema: Tema = TEMA) => {
  type Bloco = {palavras: {w: string; s: number}[]; ini: number; fim: number};
  const BLOCOS: Bloco[] = [];
  let cur: Palavra[] = [];
  const fraca = /^(o|a|os|as|um|uma|de|da|do|das|dos|pro|pra|pros|no|na|em|e|que|se|seu|sua|seus|com|por|pelo|pelos|ao|à|num|mais|não|é|lá|tá|só)$/i;
  PALAVRAS.forEach((p, i) => {
    cur.push(p);
    const pont = /[.,:?!…]$/.test(p.w);
    const prox = PALAVRAS[i + 1];
    const fimFrase = /[.?!…]$/.test(p.w);
    if (!prox || fimFrase || (pont && cur.length >= 3)) {
      BLOCOS.push({palavras: cur, ini: cur[0].s, fim: cur[cur.length - 1].e});
      cur = [];
    } else if (cur.length >= 6) {
      let corte = cur.length;
      while (corte > 3 && fraca.test(cur[corte - 1].w)) corte--;
      BLOCOS.push({palavras: cur.slice(0, corte), ini: cur[0].s, fim: cur[corte - 1].e});
      cur = cur.slice(corte);
    }
  });
  const Legenda: React.FC<{t: number}> = ({t}) => {
    let i = -1;
    for (let k = 0; k < BLOCOS.length; k++) if (BLOCOS[k].ini <= t + 0.02) i = k;
    if (i < 0) return null;
    const b = BLOCOS[i];
    if (t > b.fim + 1.2) return null; // na pausa longa a legenda some (não fica congelada)
    const some = interpolate(t, [b.fim + 0.9, b.fim + 1.2], [1, 0], clamp);
    const entra = interpolate(t - b.ini, [0, 0.14], [0, 1], {...clamp, easing: sai});
    return (
      <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.botoesX, bottom: 1920 - LEGENDA_BAIXO, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - entra) * 14}px)`, opacity: (0.4 + 0.6 * entra) * some}}>
        <div style={{maxWidth: SEGURO.botoesX - SEGURO.esq, padding: '18px 30px', borderRadius: 18, background: tema.legendaFundo, fontFamily: FONTE, fontSize: 56, fontWeight: 650, letterSpacing: -0.5, lineHeight: 1.18, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.25)'}}>
          {b.palavras.map((p, k) => {
            const dt = t - p.s;
            const pulo = dt >= 0 && dt < 0.18 ? Math.sin((Math.PI * dt) / 0.18) * 7 : 0;
            return (
              <React.Fragment key={k}>
                <span style={{display: 'inline-block', transform: `translateY(${-pulo}px)`, color: t >= p.s ? tema.legendaAceso : tema.legendaApagado}}>{p.w}</span>
                {k < b.palavras.length - 1 ? ' ' : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };
  return Legenda;
};

// ---------- Marca do topo: "SÉRIE · ASSUNTO" (sem série escolhida, só o assunto) ----------
export const Marca: React.FC<{assunto: string; tema?: Tema}> = ({assunto, tema = TEMA}) => (
  <div style={{position: 'absolute', top: Y_MARCA, left: SEGURO.esq + 4, fontFamily: MONO, fontSize: 24, letterSpacing: 6, color: tema.marca}}>
    {SERIE ? `${SERIE.toUpperCase()} · ${assunto.toUpperCase()}` : assunto.toUpperCase()}
  </div>
);

// ---------- Pílula de estado (o "capítulo" do vídeo) ----------
export const Pilula: React.FC<{estado: string; t: number; troca?: number; y?: number; tema?: Tema}> = ({estado, t, troca = 0, y = Y_PILULA, tema = TEMA}) => {
  const k = interpolate(t - troca, [0, 0.25], [0, 1], clamp);
  const pop = 1 + 0.08 * Math.sin(Math.PI * interpolate(t - troca, [0, 0.32], [0, 1], clamp));
  return (
    <div style={{position: 'absolute', left: SEGURO.esq, top: y, transform: `scale(${pop})`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 26px 12px 14px', borderRadius: 999, background: tema.pilulaFundo, boxShadow: tema.nome === 'creme' ? '0 6px 24px rgba(30,29,27,0.18)' : '0 0 0 1.5px rgba(200,208,218,0.18)'}}>
      <div style={{width: 34, height: 34, borderRadius: 17, background: tema.pilulaTexto}} />
      <div style={{width: 11, height: 11, borderRadius: 6, background: tema.acento, opacity: 0.4 + 0.6 * k}} />
      <div style={{fontFamily: MONO, fontSize: 28, letterSpacing: 4, fontWeight: 600, color: tema.pilulaTexto, transform: `translateY(${(1 - k) * 8}px)`, opacity: k}}>{estado}</div>
    </div>
  );
};

// ---------- Linha de chips (centralizada) ----------
export const Linha: React.FC<{y?: number; children: React.ReactNode; op?: number}> = ({y = Y_TOPO, children, op = 1}) => (
  <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.dir, top: y, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, opacity: op}}>{children}</div>
);
// Chip: um fato curto (2–4 palavras, maiúsculas). `destaque` = no acento.
export const Chip: React.FC<{texto: string; k: number; destaque?: boolean; tam?: number; tema?: Tema}> = ({texto, k, destaque, tam = 32, tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{display: 'inline-block', padding: '13px 24px', borderRadius: 999, background: destaque ? tema.acento : tema.pilulaFundo, border: destaque ? 'none' : '2px solid rgba(200,208,218,0.25)', color: destaque ? '#121212' : tema.pilulaTexto, fontFamily: MONO, fontWeight: 700, fontSize: tam, letterSpacing: 3, opacity: c01(k * 1.5), transform: `scale(${0.7 + 0.3 * c01(k)})`, whiteSpace: 'nowrap'}}>
      {texto}
    </div>
  );
// Carimbo: A VIRADA (1 por bloco, no máximo). Entra estalando e fica torto.
export const Carimbo: React.FC<{texto: string; k: number; y?: number; tam?: number; tema?: Tema}> = ({texto, k, y = Y_CARIMBO, tam = 60, tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.dir, top: Math.min(y, Y_BAIXO), display: 'flex', justifyContent: 'center', opacity: c01(k * 1.6), transform: `scale(${1.6 - 0.6 * c01(k)}) rotate(-4deg)`}}>
      <div style={{padding: '12px 32px', borderRadius: 16, border: `6px solid ${tema.acento}`, background: tema.nome === 'creme' ? 'rgba(255,253,248,0.94)' : 'rgba(11,14,18,0.92)', fontFamily: FONTE, fontWeight: 850, fontSize: tam, color: tema.acento, whiteSpace: 'nowrap', maxWidth: SEGURO.dir - SEGURO.esq - 40, overflow: 'hidden'}}>{texto}</div>
    </div>
  );
// Número grande (valor + unidade + rótulo em mono)
export const Numero: React.FC<{valor: string; unidade?: string; rotulo: string; k: number; y?: number; lado?: 'esq' | 'dir'; tema?: Tema}> = ({valor, unidade = '', rotulo, k, y = Y_TOPO + 20, lado = 'esq', tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{position: 'absolute', [lado === 'esq' ? 'left' : 'right']: lado === 'esq' ? SEGURO.esq + 20 : 1080 - SEGURO.dir + 20, top: y, textAlign: lado === 'esq' ? 'left' : 'right', opacity: c01(k * 1.5), transform: `translateY(${(1 - c01(k)) * 24}px)`}}>
      <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: tema.acento}}>{rotulo}</div>
      <div style={{fontFamily: FONTE, fontSize: 116, fontWeight: 900, color: tema.texto, lineHeight: 1, letterSpacing: -4}}>
        {valor} {unidade ? <span style={{fontSize: 42, fontWeight: 750, letterSpacing: -1}}>{unidade}</span> : null}
      </div>
    </div>
  );
// Conta animada: de `de` até `ate` conforme k (para números que sobem: 0 → 2,45 GHz)
export const conta = (de: number, ate: number, k: number, casas = 0) =>
  (de + (ate - de) * c01(k)).toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas});

// Cartão: título + linhas curtas (lista de direitos, passos, ingredientes). Cada linha acende na sua palavra.
export const Cartao: React.FC<{titulo: string; linhas: {texto: string; k: number; destaque?: boolean}[]; k: number; y?: number; tema?: Tema}> = ({titulo, linhas, k, y = Y_TOPO + 20, tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{position: 'absolute', left: SEGURO.esq + 10, right: 1080 - SEGURO.botoesX + 10, top: y, padding: '26px 30px', borderRadius: 22, background: tema.cartao, border: `2px solid ${tema.cartaoBorda}`, opacity: c01(k * 1.5), transform: `translateY(${(1 - c01(k)) * 30}px)`}}>
      <div style={{fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: tema.textoSuave, marginBottom: 12}}>{titulo}</div>
      {linhas.map((l, i) => (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, opacity: 0.25 + 0.75 * c01(l.k), transform: `translateX(${(1 - c01(l.k)) * 20}px)`}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: l.destaque ? tema.acento : tema.textoSuave}} />
          <div style={{fontFamily: FONTE, fontSize: 44, fontWeight: 700, color: l.destaque ? tema.acento : tema.texto, letterSpacing: -0.5}}>{l.texto}</div>
        </div>
      ))}
    </div>
  );
// Placar: dois números lado a lado (antes × depois, lugares × passagens)
export const Placar: React.FC<{a: {valor: string; rotulo: string}; b: {valor: string; rotulo: string; destaque?: boolean}; k: number; kb?: number; y?: number; sinal?: string; tema?: Tema}> = ({a, b, k, kb = k, y = Y_TOPO + 10, sinal = '×', tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.dir, top: y, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 34, opacity: c01(k * 1.5)}}>
      {[a, null, b].map((x, i) =>
        x === null ? (
          <div key={i} style={{fontFamily: FONTE, fontSize: 60, fontWeight: 800, color: tema.textoSuave, paddingBottom: 30}}>{sinal}</div>
        ) : (
          <div key={i} style={{textAlign: 'center', opacity: i === 2 ? c01(kb * 1.5) : 1, transform: i === 2 ? `scale(${0.8 + 0.2 * c01(kb)})` : undefined}}>
            <div style={{fontFamily: FONTE, fontSize: 112, fontWeight: 900, lineHeight: 1, letterSpacing: -4, color: i === 2 && (x as {destaque?: boolean}).destaque ? tema.acento : tema.texto}}>{x.valor}</div>
            <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: tema.textoSuave, marginTop: 6}}>{x.rotulo}</div>
          </div>
        ),
      )}
    </div>
  );
// Medidor: barra horizontal que enche (tanque, bateria, "espaço na barriga", progresso)
export const Medidor: React.FC<{rotulo: string; valor: number; k: number; y?: number; texto?: string; tema?: Tema}> = ({rotulo, valor, k, y = Y_TOPO + 40, texto, tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{position: 'absolute', left: SEGURO.esq + 20, right: 1080 - SEGURO.botoesX + 20, top: y, opacity: c01(k * 1.5)}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: tema.textoSuave}}>
        <span>{rotulo}</span>
        <span style={{color: tema.acento}}>{texto ?? `${Math.round(c01(valor) * 100)}%`}</span>
      </div>
      <div style={{marginTop: 10, height: 18, borderRadius: 9, background: tema.pilulaFundo, overflow: 'hidden'}}>
        <div style={{width: `${c01(valor) * 100}%`, height: '100%', borderRadius: 9, background: tema.acento}} />
      </div>
    </div>
  );

// Etiqueta: rótulo com linha até um ponto da cena (o ponto vem de pj(ponto3D, cam)).
// v1.2: a caixa nunca sai da área segura nem desce para a legenda (é empurrada para dentro sozinha).
export const Etiqueta: React.FC<{x: number; y: number; alvo: {x: number; y: number}; titulo: string; sub?: string; aparece: number; destaque?: boolean; largura?: number; tema?: Tema}> = ({
  x,
  y,
  alvo,
  titulo,
  sub,
  aparece,
  destaque,
  largura = 360,
  tema = TEMA,
}) => {
  if (aparece <= 0) return null;
  const bx = Math.min(Math.max(x, SEGURO.esq), SEGURO.botoesX - largura);
  const by = Math.min(Math.max(y, ETIQUETA_MIN), ETIQUETA_MAX);
  const borda = destaque ? tema.acento : tema.nome === 'creme' ? 'rgba(30,29,27,0.55)' : 'rgba(200,208,218,0.45)';
  const ancora = {x: alvo.x < bx ? bx : alvo.x > bx + largura ? bx + largura : bx + 26, y: by + 34};
  const linha = interpolate(aparece, [0, 0.55], [0, 1], {...clamp, easing: sai});
  const caixa = interpolate(aparece, [0.3, 1], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const caixaOp = interpolate(aparece, [0.3, 0.55], [0, 1], clamp);
  const ax = Math.min(Math.max(alvo.x, 0), 1080);
  const ay = Math.min(Math.max(alvo.y, 0), 1920);
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'visible'}}>
        <line x1={ax} y1={ay} x2={ax + (ancora.x - ax) * linha} y2={ay + (ancora.y - ay) * linha} stroke={borda} strokeWidth={2.5} />
        <circle cx={ax} cy={ay} r={7 * Math.min(1, aparece * 4)} fill={destaque ? tema.acento : tema.etiquetaTexto} />
      </svg>
      <div style={{position: 'absolute', left: bx, top: by, maxWidth: largura, padding: '12px 22px 12px 18px', borderRadius: 12, border: `2.5px solid ${borda}`, background: tema.etiquetaFundo, opacity: caixaOp, transform: `scale(${0.7 + 0.3 * caixa})`, transformOrigin: 'left center', display: 'flex', gap: 14, alignItems: 'flex-start'}}>
        <div style={{marginTop: 13, width: 10, height: 10, borderRadius: 5, border: `2.5px solid ${destaque ? tema.acento : tema.etiquetaTexto}`, flexShrink: 0}} />
        <div>
          <div style={{fontFamily: FONTE, fontSize: 34, fontWeight: 650, color: tema.etiquetaTexto, letterSpacing: -0.3}}>{titulo}</div>
          {sub ? <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2.5, color: tema.etiquetaSub, marginTop: 4}}>{sub}</div> : null}
        </div>
      </div>
    </>
  );
};

// Visor: texto aceso preso a um ponto (display de aparelho, placar de rua)
export const Visor: React.FC<{p: {x: number; y: number}; texto: string; k?: number; tam?: number; tema?: Tema}> = ({p, texto, k = 1, tam = 30, tema = TEMA}) =>
  k <= 0 ? null : (
    <div style={{position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)', fontFamily: MONO, fontWeight: 700, fontSize: tam, color: tema.acento, textShadow: `0 0 12px ${tema.acento}`, opacity: k, letterSpacing: 2}}>{texto}</div>
  );

// Cota: medida entre dois pontos da tela (pj(a), pj(b)), com tracinhos nas pontas e o valor no meio.
export const Cota: React.FC<{a: {x: number; y: number}; b: {x: number; y: number}; texto: string; k: number; desloca?: number; tema?: Tema}> = ({a, b, texto, k, desloca = 40, tema = TEMA}) => {
  if (k <= 0) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * desloca;
  const ny = (dx / L) * desloca;
  const A = {x: a.x + nx, y: a.y + ny};
  const B = {x: A.x + dx * c01(k), y: A.y + dy * c01(k)};
  const tick = (p: {x: number; y: number}) => <line x1={p.x - (nx / desloca) * 16} y1={p.y - (ny / desloca) * 16} x2={p.x + (nx / desloca) * 16} y2={p.y + (ny / desloca) * 16} stroke={tema.acento} strokeWidth={4} />;
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'visible'}}>
        <line x1={a.x} y1={a.y} x2={A.x} y2={A.y} stroke={tema.linha} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 6" />
        <line x1={b.x} y1={b.y} x2={b.x + nx} y2={b.y + ny} stroke={tema.linha} strokeOpacity={0.35 * c01(k * 2 - 1)} strokeWidth={2} strokeDasharray="6 6" />
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={tema.acento} strokeWidth={4} />
        {tick(A)}
        {k >= 0.98 ? tick(B) : null}
      </svg>
      <div style={{position: 'absolute', left: (A.x + A.x + dx) / 2 + nx * 0.9, top: (A.y + A.y + dy) / 2 + ny * 0.9, transform: 'translate(-50%,-50%)', padding: '8px 16px', borderRadius: 10, background: tema.etiquetaFundo, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: tema.acento, opacity: c01(k * 2 - 1), whiteSpace: 'nowrap'}}>{texto}</div>
    </>
  );
};
