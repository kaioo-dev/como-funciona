// Os cartões de cada bloco (ficam na parte de baixo da área do mapa, dentro da área segura do Reels).
// Cada linha entra quando a palavra dela é dita (`k` de 0 a 1 vindo do Boletim).
import React from 'react';
import {interpolate} from 'remotion';
import {COR, FONTE, MONO, SEGURO} from '../estilo';
import type {DadosCombustivel, DadosMare, DadosTempo, Item} from '../tipos';

const c01 = (x: number) => Math.min(1, Math.max(0, x));
export const CARTAO = {x: SEGURO.esq, y: 800, w: SEGURO.botoesX - SEGURO.esq, h: 440};
const brl = (v: number, casas = 2) => v.toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas});

export const Moldura: React.FC<{k: number; rotulo: string; fonte?: string; alerta?: boolean; children: React.ReactNode; h?: number}> = ({k, rotulo, fonte, alerta, children, h = CARTAO.h}) =>
  k <= 0 ? null : (
    <div
      style={{
        position: 'absolute',
        left: CARTAO.x,
        top: CARTAO.y + (CARTAO.h - h),
        width: CARTAO.w,
        height: h,
        boxSizing: 'border-box',
        padding: '26px 32px',
        borderRadius: 28,
        background: COR.painel,
        border: `2.5px solid ${alerta ? COR.acento : COR.painelBorda}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        opacity: c01(k * 1.6),
        transform: `translateY(${(1 - c01(k)) * 40}px)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 12, height: 12, borderRadius: 6, background: COR.acento}} />
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: alerta ? COR.acento : COR.textoSuave}}>{rotulo}</div>
      </div>
      <div style={{flex: 1, marginTop: 14, display: 'flex', flexDirection: 'column'}}>{children}</div>
      {fonte ? <div style={{fontFamily: MONO, fontSize: 16, letterSpacing: 1, color: COR.textoSuave, opacity: 0.8, marginTop: 8}}>FONTE: {fonte.toUpperCase()}</div> : null}
    </div>
  );

// ---------- ícones de tempo (desenhados, sem imagens) ----------
const Icone: React.FC<{chance: number; mm: number; noite?: boolean}> = ({chance, mm, noite}) => {
  const chove = mm >= 0.5 || chance >= 60;
  const nublado = !chove && chance >= 30;
  return (
    <svg width={86} height={70} viewBox="0 0 86 70">
      {!chove && !nublado ? (
        noite ? (
          <path d="M50 12a24 24 0 1 0 18 38A20 20 0 0 1 50 12z" fill={COR.texto} />
        ) : (
          <g>
            <circle cx={43} cy={35} r={15} fill={COR.acento} />
            {Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return <line key={i} x1={43 + Math.cos(a) * 21} y1={35 + Math.sin(a) * 21} x2={43 + Math.cos(a) * 28} y2={35 + Math.sin(a) * 28} stroke={COR.acento} strokeWidth={4} strokeLinecap="round" />;
            })}
          </g>
        )
      ) : null}
      {nublado || chove ? (
        <g>
          {nublado && !noite ? <circle cx={30} cy={26} r={12} fill={COR.acento} /> : null}
          <path d="M22 50a14 14 0 0 1 4-27 18 18 0 0 1 34 4 12 12 0 0 1 4 23z" fill={COR.texto} />
        </g>
      ) : null}
      {chove
        ? [24, 40, 56].map((x) => <line key={x} x1={x} y1={56} x2={x - 5} y2={67} stroke={COR.agua} strokeWidth={4} strokeLinecap="round" />)
        : null}
    </svg>
  );
};

export const CartaoTempo: React.FC<{d: DadosTempo; k: number; kPer: number[]; kRodape: number}> = ({d, k, kPer, kRodape}) => (
  <Moldura k={k} rotulo="TEMPO HOJE" fonte={d.fonte}>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
      <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 84, letterSpacing: -3, color: COR.texto, lineHeight: 1}}>
        {d.min}° <span style={{color: COR.textoSuave, fontWeight: 600}}>a</span> {d.max}°
      </div>
      <div style={{fontFamily: MONO, fontSize: 22, color: COR.textoSuave, letterSpacing: 2}}>MÍN · MÁX</div>
    </div>
    <div style={{display: 'flex', gap: 14, marginTop: 18}}>
      {d.periodos.map((p, i) => (
        <div key={p.nome} style={{flex: 1, borderRadius: 18, background: COR.fundo, padding: '12px 14px', opacity: c01((kPer[i] ?? 1) * 1.5), transform: `translateY(${(1 - c01(kPer[i] ?? 1)) * 16}px)`}}>
          <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 3, color: COR.textoSuave}}>{p.nome}</div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <Icone chance={p.chance} mm={p.chuva_mm} noite={p.nome === 'NOITE'} />
            <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 42, color: COR.texto}}>{p.temp}°</div>
          </div>
          <div style={{fontFamily: FONTE, fontWeight: 650, fontSize: 24, color: p.chance >= 60 ? COR.acento : COR.textoSuave}}>
            chuva {p.chance}%{p.chuva_mm >= 0.5 ? ` · ${brl(p.chuva_mm, 0)} mm` : ''}
          </div>
        </div>
      ))}
    </div>
    <div style={{display: 'flex', gap: 26, marginTop: 'auto', fontFamily: FONTE, fontSize: 25, fontWeight: 650, color: COR.texto, opacity: c01(kRodape * 1.5)}}>
      <span>
        UV <span style={{color: d.uv_max >= 8 ? COR.acento : COR.texto}}>{brl(d.uv_max, 0)}{d.uv_max >= 8 ? ' (muito alto)' : d.uv_max >= 6 ? ' (alto)' : ''}</span>
      </span>
      <span style={{color: COR.textoSuave}}>
        sol {d.nascer} – {d.por}
      </span>
    </div>
  </Moldura>
);

// maré: a curva do dia (modelo) com as marés altas marcadas
const hora = (h: string) => Number(h.slice(0, 2)) + Number(h.slice(3, 5)) / 60;
export const CartaoMare: React.FC<{d: DadosMare; k: number; kCurva: number; kAltas: number[]}> = ({d, k, kCurva, kAltas}) => {
  const W = CARTAO.w - 64;
  const H = 190;
  const ns = d.serie.map((p) => p.nivel);
  const mn = Math.min(...ns, ...d.baixas.map((b) => b.nivel)) - 0.1;
  const mx = Math.max(...ns, ...d.altas.map((a) => a.nivel)) + 0.15;
  const X = (h: number) => (h / 24) * W;
  const Y = (v: number) => H - ((v - mn) / (mx - mn)) * H;
  const pts = d.serie.map((p) => [X(hora(p.hora)), Y(p.nivel)] as const);
  const corte = Math.max(2, Math.round(pts.length * c01(kCurva)));
  const linha = pts.slice(0, corte).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  return (
    <Moldura k={k} rotulo="MARÉ NA BAÍA DA BABITONGA" fonte="Open-Meteo Marine · previsão aproximada">
      <svg width={W} height={H + 40} style={{marginTop: 4, overflow: 'visible'}}>
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1={X(h)} y1={0} x2={X(h)} y2={H} stroke={COR.painelBorda} strokeWidth={1.5} />
            <text x={X(h)} y={H + 30} textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'} fontFamily={MONO} fontSize={20} fill={COR.textoSuave}>
              {String(h).padStart(2, '0')}h
            </text>
          </g>
        ))}
        <path d={`${linha}L${pts[corte - 1][0]} ${H}L0 ${H}Z`} fill={COR.agua} opacity={0.35} />
        <path d={linha} fill="none" stroke={COR.agua} strokeWidth={5} strokeLinejoin="round" />
        {d.altas.map((a, i) => {
          const kk = kAltas[i] ?? 0;
          if (kk <= 0) return null;
          const x = X(hora(a.hora));
          const y = Y(a.nivel);
          const lado = x > W - 150 ? 'end' : x < 150 ? 'start' : 'middle';
          return (
            <g key={i} opacity={c01(kk * 1.6)}>
              <circle cx={x} cy={y} r={11} fill={COR.acento} />
              <text x={x} y={y - 22} textAnchor={lado} fontFamily={FONTE} fontWeight={850} fontSize={34} fill={COR.acento}>
                {a.hora.replace(':', 'h').replace(/^0/, '')}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{fontFamily: FONTE, fontSize: 26, fontWeight: 650, color: COR.texto, marginTop: 'auto'}}>
        Maré alta: {d.altas.map((a) => a.hora.replace(':', 'h').replace(/^0/, '')).join(' e ')}
      </div>
    </Moldura>
  );
};

export const CartaoCombustivel: React.FC<{d: DadosCombustivel; k: number; kItens: number[]}> = ({d, k, kItens}) => {
  const fmt = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return (
    <Moldura k={k} rotulo={`COMBUSTÍVEL · MÉDIA EM JOINVILLE`} fonte={`ANP, semana de ${fmt(d.semana[0])} a ${fmt(d.semana[1])}`}>
      {d.itens.slice(0, 4).map((it, i) => (
        <div key={it.nome} style={{display: 'flex', alignItems: 'baseline', gap: 18, padding: '7px 0', borderBottom: i < 3 ? `1.5px solid ${COR.painelBorda}` : 'none', opacity: c01((kItens[i] ?? 1) * 1.5), transform: `translateX(${(1 - c01(kItens[i] ?? 1)) * 24}px)`}}>
          <div style={{fontFamily: FONTE, fontWeight: 700, fontSize: 34, color: COR.texto, width: 270}}>{it.nome}</div>
          <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 48, color: i === 0 ? COR.acento : COR.texto, letterSpacing: -1}}>R$ {brl(it.medio)}</div>
          <div style={{fontFamily: MONO, fontSize: 22, color: COR.textoSuave, marginLeft: 'auto'}}>
            {it.variacao === null ? '' : it.variacao === 0 ? '= SEMANA' : `${it.variacao < 0 ? '▼' : '▲'} ${brl(Math.abs(it.variacao))}`}
          </div>
        </div>
      ))}
    </Moldura>
  );
};

export const CartaoLista: React.FC<{rotulo: string; titulo: string; itens: Item[]; fonte: string; alerta?: boolean; k: number; kItens: number[]}> = ({rotulo, titulo, itens, fonte, alerta, k, kItens}) => (
  <Moldura k={k} rotulo={rotulo} fonte={fonte} alerta={alerta}>
    <div style={{fontFamily: FONTE, fontWeight: 850, fontSize: 46, letterSpacing: -1, color: COR.texto, lineHeight: 1.08}}>{titulo}</div>
    <div style={{marginTop: 12}}>
      {itens.slice(0, 4).map((it, i) => (
        <div key={i} style={{display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 10, opacity: c01((kItens[i] ?? 1) * 1.5), transform: `translateX(${(1 - c01(kItens[i] ?? 1)) * 24}px)`}}>
          <div style={{marginTop: 12, width: 14, height: 14, borderRadius: 7, background: it.bairro ? COR.acento : COR.textoSuave, flexShrink: 0}} />
          <div>
            <div style={{fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: COR.texto}}>{it.texto}</div>
            {it.detalhe || it.bairro ? (
              <div style={{fontFamily: MONO, fontSize: 21, letterSpacing: 1.5, color: COR.textoSuave, marginTop: 2}}>{[it.bairro, it.detalhe].filter(Boolean).join(' · ').toUpperCase()}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  </Moldura>
);

export const CartaoTema: React.FC<{rotulo: string; titulo: string; linhas: {texto: string; destaque?: boolean}[]; numero?: {valor: string; rotulo: string}; fonte: string; k: number; kLinhas: number[]; kNumero: number}> = ({rotulo, titulo, linhas, numero, fonte, k, kLinhas, kNumero}) => (
  <Moldura k={k} rotulo={rotulo} fonte={fonte}>
    <div style={{fontFamily: FONTE, fontWeight: 850, fontSize: 46, letterSpacing: -1, color: COR.texto, lineHeight: 1.08}}>{titulo}</div>
    {numero ? (
      <div style={{display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 10, opacity: c01(kNumero * 1.5)}}>
        <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 86, letterSpacing: -3, color: COR.acento, lineHeight: 1}}>{numero.valor}</div>
        <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: COR.textoSuave}}>{numero.rotulo.toUpperCase()}</div>
      </div>
    ) : null}
    <div style={{marginTop: 8}}>
      {linhas.slice(0, 4).map((l, i) => (
        <div key={i} style={{display: 'flex', gap: 14, alignItems: 'center', marginTop: 8, opacity: c01((kLinhas[i] ?? 1) * 1.5)}}>
          <div style={{width: 12, height: 12, borderRadius: 6, background: l.destaque ? COR.acento : COR.textoSuave}} />
          <div style={{fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: l.destaque ? COR.acento : COR.texto}}>{l.texto}</div>
        </div>
      ))}
    </div>
  </Moldura>
);

export const CartaoPatrocinio: React.FC<{nome: string; frase: string; imagem?: string; k: number}> = ({nome, frase, imagem, k}) => (
  <Moldura k={k} rotulo="OFERECIDO POR" h={300}>
    <div style={{display: 'flex', alignItems: 'center', gap: 26, flex: 1}}>
      {imagem ? <img src={imagem} style={{width: 150, height: 150, objectFit: 'contain', borderRadius: 18, background: '#fff'}} /> : null}
      <div>
        <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 60, letterSpacing: -2, color: COR.texto, lineHeight: 1.02}}>{nome}</div>
        <div style={{fontFamily: FONTE, fontWeight: 600, fontSize: 30, color: COR.textoSuave, marginTop: 8}}>{frase}</div>
      </div>
    </div>
  </Moldura>
);

export const entrada = (t: number, a: number, dur = 0.45) => interpolate(t, [a, a + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
