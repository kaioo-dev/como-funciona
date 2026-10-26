// Os cartões de cada bloco (ficam na parte de baixo da área do mapa, dentro da área segura do Reels).
// Cada linha entra quando a palavra dela é dita (`k` de 0 a 1 vindo do Boletim).
import React, {createContext, useContext} from 'react';
import {interpolate} from 'remotion';
import {COR, FONTE, MONO, SEGURO} from '../estilo';
import type {Amanha, DadosAr, DadosCombustivel, DadosMare, DadosPostos, DadosTempo, Item} from '../tipos';

const c01 = (x: number) => Math.min(1, Math.max(0, x));
// quanto o cartão atual já saiu (0..1): o Boletim fornece na troca de bloco; o cartão desliza para a esquerda
export const SaidaCtx = createContext(0);
export const CARTAO = {x: SEGURO.esq, y: 800, w: SEGURO.botoesX - SEGURO.esq, h: 440};
const brl = (v: number, casas = 2) => v.toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas});

export const Moldura: React.FC<{k: number; rotulo: string; fonte?: string; alerta?: boolean; children: React.ReactNode; h?: number}> = ({k, rotulo, fonte, alerta, children, h = CARTAO.h}) => {
  const saida = useContext(SaidaCtx);
  return k <= 0 ? null : (
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
        opacity: c01(k * 1.6) * (1 - c01(saida)),
        transform: `translateX(${(1 - c01(k)) * 120 - c01(saida) * 160}px) scale(${0.96 + 0.04 * c01(k)})`,
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
};

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
      <svg width={W} height={H + 40} style={{marginTop: 14, overflow: 'visible'}}>
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
              <text x={x} y={y - 22 < 34 ? y + 44 : y - 22} textAnchor={lado} fontFamily={FONTE} fontWeight={850} fontSize={34} fill={COR.acento}>
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

// ======================= v2: cartões mais ricos e animados =======================

// número que conta até o valor (temperaturas, preços)
export const conta = (de: number, ate: number, k: number, casas = 0) => brl(de + (ate - de) * c01(k), casas);

// manchete: o texto grande que estala no topo do mapa
export const Manchete: React.FC<{texto: string; k: number; sai: number}> = ({texto, k, sai}) => {
  if (k <= 0 || sai <= 0) return null;
  const e = interpolate(k, [0, 0.6, 1], [0.6, 1.06, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.dir, top: 392, display: 'flex', justifyContent: 'center', opacity: c01(k * 2) * sai, transform: `scale(${e}) translateY(${(1 - sai) * -20}px)`}}>
      <div style={{padding: '14px 30px', borderRadius: 18, background: COR.acento, color: COR.acentoTexto, fontFamily: FONTE, fontWeight: 900, fontSize: 54, letterSpacing: -1, whiteSpace: 'nowrap', boxShadow: '0 12px 40px rgba(0,0,0,0.45)'}}>{texto}</div>
    </div>
  );
};

const Icone2: React.FC<{condicao: string; tam?: number}> = ({condicao, tam = 120}) => {
  const sol = condicao.includes('sol') || condicao.includes('limpo');
  const chuva = condicao.includes('chuva') || condicao.includes('garoa') || condicao.includes('temporal');
  return (
    <svg width={tam} height={tam} viewBox="0 0 100 100">
      {sol ? (
        <g>
          <circle cx={chuva ? 38 : 50} cy={40} r={18} fill={COR.acento} />
          {Array.from({length: 8}, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const cx = chuva ? 38 : 50;
            return <line key={i} x1={cx + Math.cos(a) * 25} y1={40 + Math.sin(a) * 25} x2={cx + Math.cos(a) * 33} y2={40 + Math.sin(a) * 33} stroke={COR.acento} strokeWidth={5} strokeLinecap="round" />;
          })}
        </g>
      ) : null}
      {!condicao.includes('limpo') ? <path d="M30 78a17 17 0 0 1 4-33 22 22 0 0 1 42 6 14 14 0 0 1 3 27z" fill={COR.texto} opacity={sol ? 0.92 : 1} /> : null}
      {chuva ? [38, 54, 70].map((x) => <line key={x} x1={x} y1={84} x2={x - 5} y2={96} stroke={COR.agua} strokeWidth={5} strokeLinecap="round" />) : null}
    </svg>
  );
};

export const CartaoResumo: React.FC<{d: DadosTempo; k: number; kNum: number; kSens: number}> = ({d, k, kNum, kSens}) => {
  const manha = d.horas?.find((h) => h.hora === '07:00');
  return (
    <Moldura k={k} rotulo="O DIA EM JOINVILLE" fonte={d.fonte}>
      <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <Icone2 condicao={d.condicao ?? ''} tam={150} />
        <div>
          <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 104, letterSpacing: -4, color: COR.texto, lineHeight: 1}}>
            {conta(d.min - 6, d.min, kNum)}° <span style={{color: COR.textoSuave, fontWeight: 600, fontSize: 70}}>→</span> {conta(d.max - 8, d.max, kNum)}°
          </div>
          <div style={{fontFamily: FONTE, fontWeight: 700, fontSize: 38, color: COR.acento, marginTop: 6}}>{(d.condicao ?? '').replace(/^./, (c) => c.toUpperCase())}</div>
        </div>
      </div>
      {manha ? (
        <div style={{marginTop: 'auto', display: 'flex', gap: 14, opacity: c01(kSens * 1.5), transform: `translateY(${(1 - c01(kSens)) * 14}px)`}}>
          <div style={{flex: 1, borderRadius: 16, background: COR.fundo, padding: '12px 18px'}}>
            <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: COR.textoSuave}}>ÀS 7H</div>
            <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 36, color: COR.texto}}>{Math.round(manha.temp)}° · casaco leve</div>
          </div>
          <div style={{flex: 1, borderRadius: 16, background: COR.fundo, padding: '12px 18px'}}>
            <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: COR.textoSuave}}>SOL</div>
            <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 36, color: COR.texto}}>
              {d.nascer} – {d.por}
            </div>
          </div>
        </div>
      ) : null}
    </Moldura>
  );
};

// hora a hora: curva da temperatura + barras da chance de chuva + um cursor que passa pelas horas
export const CartaoHora: React.FC<{d: DadosTempo; k: number; kCurva: number; cursor: number; kChip: number}> = ({d, k, kCurva, cursor, kChip}) => {
  const hs = d.horas ?? [];
  if (!hs.length) return null;
  const W = CARTAO.w - 64;
  const H = 170;
  const tmin = Math.min(...hs.map((h) => h.temp)) - 1;
  const tmax = Math.max(...hs.map((h) => h.temp)) + 1;
  const X = (i: number) => (i / (hs.length - 1)) * W;
  const Y = (v: number) => 20 + (1 - (v - tmin) / (tmax - tmin)) * (H - 70);
  const n = Math.max(2, Math.round(hs.length * c01(kCurva)));
  const linha = hs.slice(0, n).map((h, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(h.temp).toFixed(1)}`).join('');
  const ic = Math.min(hs.length - 1, Math.max(0, Math.round(cursor * (hs.length - 1))));
  const hc = hs[ic];
  return (
    <Moldura k={k} rotulo="HORA A HORA" fonte={d.fonte}>
      <svg width={W} height={H + 34} style={{overflow: 'visible'}}>
        {hs.map((h, i) => {
          const bh = (h.chance / 100) * 60;
          return <rect key={i} x={X(i) - 10} y={H - bh} width={20} height={bh} rx={5} fill={COR.agua} opacity={0.25 + 0.6 * c01(kCurva * hs.length - i)} />;
        })}
        <path d={linha} fill="none" stroke={COR.acento} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        {hs.map((h, i) =>
          i % 3 === 0 ? (
            <text key={i} x={X(i)} y={H + 28} textAnchor="middle" fontFamily={MONO} fontSize={19} fill={COR.textoSuave}>
              {Number(h.hora.slice(0, 2))}h
            </text>
          ) : null,
        )}
        {cursor > 0 ? (
          <g>
            <line x1={X(ic)} y1={10} x2={X(ic)} y2={H} stroke={COR.texto} strokeWidth={2} strokeDasharray="5 6" opacity={0.6} />
            <circle cx={X(ic)} cy={Y(hc.temp)} r={12} fill={COR.texto} stroke={COR.acento} strokeWidth={5} />
            <g transform={`translate(${Math.min(W - 200, Math.max(0, X(ic) - 100))}, -26)`}>
              <rect width={200} height={44} rx={22} fill={COR.fundo} stroke={COR.painelBorda} strokeWidth={2} />
              <text x={100} y={30} textAnchor="middle" fontFamily={FONTE} fontWeight={800} fontSize={26} fill={COR.texto}>
                {Number(hc.hora.slice(0, 2))}h · {Math.round(hc.temp)}° · {hc.chance}%
              </text>
            </g>
          </g>
        ) : null}
      </svg>
      <div style={{marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14, opacity: c01(kChip * 1.5), transform: `scale(${0.9 + 0.1 * c01(kChip)})`, transformOrigin: 'left center'}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: d.guarda_chuva ? COR.acento : COR.agua}} />
        <div style={{fontFamily: FONTE, fontWeight: 850, fontSize: 36, color: COR.texto}}>{d.guarda_chuva ? 'Leve o guarda-chuva' : 'Guarda-chuva pode ficar em casa'}</div>
      </div>
    </Moldura>
  );
};

export const CartaoSol: React.FC<{d: DadosTempo; ar?: DadosAr; k: number; kUv: number; kVento: number; kAr: number}> = ({d, ar, k, kUv, kVento, kAr}) => {
  const hs = d.horas ?? [];
  const W = CARTAO.w - 64;
  const nivel = (uv: number) => (uv >= 8 ? COR.acento : uv >= 6 ? '#E8A83A' : uv >= 3 ? COR.textoSuave : COR.painelBorda);
  return (
    <Moldura k={k} rotulo="SOL, VENTO E AR" fonte={ar ? `${d.fonte} · ${ar.fonte}` : d.fonte}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
        <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 86, letterSpacing: -3, color: COR.acento, lineHeight: 1}}>UV {conta(0, d.uv_max, kUv)}</div>
        <div style={{fontFamily: FONTE, fontWeight: 700, fontSize: 32, color: COR.texto}}>{d.uv_alto ? `alto das ${Number(d.uv_alto[0].slice(0, 2))}h às ${Number(d.uv_alto[1].slice(0, 2))}h` : 'baixo hoje'}</div>
      </div>
      <div style={{display: 'flex', gap: 4, marginTop: 14, width: W}}>
        {hs.filter((h) => Number(h.hora.slice(0, 2)) <= 19).map((h, i) => (
          <div key={i} style={{flex: 1, textAlign: 'center'}}>
            <div style={{height: 22, borderRadius: 6, background: nivel(h.uv), opacity: c01(kUv * 14 - i * 0.6)}} />
            {i % 3 === 0 ? <div style={{fontFamily: MONO, fontSize: 17, color: COR.textoSuave, marginTop: 4}}>{Number(h.hora.slice(0, 2))}h</div> : null}
          </div>
        ))}
      </div>
      <div style={{display: 'flex', gap: 14, marginTop: 'auto'}}>
        {d.rajada_max ? (
          <div style={{flex: 1, borderRadius: 16, background: COR.fundo, padding: '12px 18px', opacity: c01(kVento * 1.5)}}>
            <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: COR.textoSuave}}>RAJADAS</div>
            <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 36, color: COR.texto}}>
              {d.rajada_max.kmh} km/h · {Number(d.rajada_max.hora.slice(0, 2))}h
            </div>
          </div>
        ) : null}
        {ar ? (
          <div style={{flex: 1, borderRadius: 16, background: COR.fundo, padding: '12px 18px', opacity: c01(kAr * 1.5)}}>
            <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: COR.textoSuave}}>QUALIDADE DO AR</div>
            <div style={{fontFamily: FONTE, fontWeight: 800, fontSize: 36, color: COR.texto}}>{ar.nivel.replace(/^./, (c) => c.toUpperCase())}</div>
          </div>
        ) : null}
      </div>
    </Moldura>
  );
};

export const CartaoPostos: React.FC<{d: DadosPostos; k: number; kBarato: number; kCaro: number; kTanque: number}> = ({d, k, kBarato, kCaro, kTanque}) => {
  const fmt = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  const dif = (d.mais_caro.preco - d.mais_barato.preco) * d.tanque;
  const Linha: React.FC<{p: typeof d.mais_barato; rot: string; kk: number; ac?: boolean}> = ({p, rot, kk, ac}) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '10px 0', opacity: c01(kk * 1.5), transform: `translateX(${(1 - c01(kk)) * 30}px)`}}>
      <div style={{width: 120, fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: ac ? COR.acento : COR.textoSuave}}>{rot}</div>
      <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 56, letterSpacing: -2, color: ac ? COR.acento : COR.texto, width: 250}}>R$ {conta(d.mais_barato.preco, p.preco, kk, 2)}</div>
      <div>
        <div style={{fontFamily: FONTE, fontWeight: 700, fontSize: 28, color: COR.texto}}>{p.bairro}</div>
        <div style={{fontFamily: MONO, fontSize: 17, color: COR.textoSuave}}>{p.posto.toUpperCase().slice(0, 30)}</div>
      </div>
    </div>
  );
  return (
    <Moldura k={k} rotulo={`${d.produto.toUpperCase()} · ${d.pesquisados} POSTOS PESQUISADOS`} fonte={`ANP, coleta de ${fmt(d.mais_barato.coleta)} (semana ${fmt(d.semana[0])}–${fmt(d.semana[1])})`}>
      <Linha p={d.mais_barato} rot="MAIS BARATO" kk={kBarato} ac />
      <div style={{height: 1.5, background: COR.painelBorda}} />
      <Linha p={d.mais_caro} rot="MAIS CARO" kk={kCaro} />
      <div style={{marginTop: 'auto', fontFamily: FONTE, fontWeight: 800, fontSize: 34, color: COR.texto, opacity: c01(kTanque * 1.5)}}>
        Num tanque de {d.tanque} L: <span style={{color: COR.acento}}>R$ {brl(dif, 0)} de diferença</span>
      </div>
    </Moldura>
  );
};

export const CartaoCombustivel2: React.FC<{d: DadosCombustivel; k: number; kG: number; kE: number; kConta: number}> = ({d, k, kG, kE, kConta}) => {
  const g = d.itens.find((i) => i.nome === 'Gasolina');
  const e = d.itens.find((i) => i.nome === 'Etanol');
  if (!g || !e) return null;
  const pct = (e.medio / g.medio) * 100;
  const vale = pct < 70;
  const fmt = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  return (
    <Moldura k={k} rotulo="COMBUSTÍVEL · MÉDIA EM JOINVILLE" fonte={`ANP, semana ${fmt(d.semana[0])}–${fmt(d.semana[1])}`}>
      <div style={{display: 'flex', gap: 16}}>
        {[
          {it: g, kk: kG},
          {it: e, kk: kE},
        ].map(({it, kk}) => (
          <div key={it.nome} style={{flex: 1, borderRadius: 18, background: COR.fundo, padding: '14px 20px', opacity: c01(kk * 1.5)}}>
            <div style={{fontFamily: MONO, fontSize: 21, letterSpacing: 2, color: COR.textoSuave}}>{it.nome.toUpperCase()}</div>
            <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 62, letterSpacing: -2, color: COR.texto}}>R$ {conta(it.medio * 0.8, it.medio, kk, 2)}</div>
            <div style={{fontFamily: MONO, fontSize: 19, color: COR.textoSuave}}>{it.variacao === null ? '' : it.variacao === 0 ? '= SEMANA PASSADA' : `${it.variacao < 0 ? '▼' : '▲'} ${brl(Math.abs(it.variacao))} NA SEMANA`}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 'auto', opacity: c01(kConta * 1.5)}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONTE, fontWeight: 800, fontSize: 32, color: COR.texto}}>
          <span>Etanol custa {brl(pct, 1)}% da gasolina</span>
          <span style={{color: vale ? COR.acento : COR.textoSuave}}>{vale ? 'compensa' : 'não compensa'}</span>
        </div>
        <div style={{position: 'relative', height: 18, borderRadius: 9, background: COR.fundo, marginTop: 10, overflow: 'hidden'}}>
          <div style={{width: `${c01(kConta) * Math.min(100, pct)}%`, height: '100%', background: vale ? COR.acento : COR.textoSuave, borderRadius: 9}} />
          <div style={{position: 'absolute', left: '70%', top: -4, width: 4, height: 26, background: COR.texto}} />
        </div>
        <div style={{fontFamily: MONO, fontSize: 17, color: COR.textoSuave, marginTop: 6}}>REGRA: ABAIXO DE 70% O ETANOL VALE MAIS A PENA</div>
      </div>
    </Moldura>
  );
};

export const CartaoCuriosidade: React.FC<{titulo: string; marcos: {ano: string; texto: string}[]; destaque?: string; fonte: string; k: number; kMarcos: number[]; kDestaque: number}> = ({titulo, marcos, destaque, fonte, k, kMarcos, kDestaque}) => {
  const W = CARTAO.w - 64;
  return (
    <Moldura k={k} rotulo="CURIOSIDADE DE JOINVILLE" fonte={fonte} h={560}>
      <div style={{fontFamily: FONTE, fontWeight: 850, fontSize: 44, letterSpacing: -1, color: COR.texto, lineHeight: 1.1}}>{titulo}</div>
      <div style={{position: 'relative', height: 200, marginTop: 24}}>
        <div style={{position: 'absolute', left: W * 0.2, right: W * 0.2, top: 64, height: 6, borderRadius: 3, background: COR.painelBorda}}>
          <div style={{width: `${c01(kMarcos.length > 1 ? kMarcos[kMarcos.length - 1] : 1) * 100}%`, height: '100%', background: COR.acento, borderRadius: 3}} />
        </div>
        {marcos.slice(0, 3).map((m, i) => {
          const x = marcos.length === 1 ? W / 2 : W * (0.2 + (0.6 * i) / (marcos.length - 1));
          const kk = kMarcos[i] ?? 0;
          return (
            <div key={i} style={{position: 'absolute', left: x - 150, width: 300, top: 0, textAlign: 'center', opacity: c01(kk * 1.6), transform: `translateY(${(1 - c01(kk)) * 20}px)`}}>
              <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 48, color: i === 0 ? COR.acento : COR.texto, lineHeight: 1}}>{m.ano}</div>
              <div style={{width: 22, height: 22, borderRadius: 11, background: i === 0 ? COR.acento : COR.texto, margin: '8px auto 0', border: `4px solid ${COR.painel}`}} />
              <div style={{fontFamily: FONTE, fontWeight: 650, fontSize: 25, color: COR.texto, marginTop: 10, lineHeight: 1.2}}>{m.texto}</div>
            </div>
          );
        })}
      </div>
      {destaque ? (
        <div style={{marginTop: 'auto', alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 999, background: COR.acento, color: COR.acentoTexto, fontFamily: FONTE, fontWeight: 900, fontSize: 32, opacity: c01(kDestaque * 1.5), transform: `scale(${0.85 + 0.15 * c01(kDestaque)})`, transformOrigin: 'left center'}}>
          {destaque}
        </div>
      ) : null}
    </Moldura>
  );
};

export const CartaoAmanha: React.FC<{d: Amanha; k: number; kNum: number}> = ({d, k, kNum}) => (
  <Moldura k={k} rotulo="AMANHÃ" h={300}>
    <div style={{display: 'flex', alignItems: 'center', gap: 22, flex: 1}}>
      <Icone2 condicao={d.chance_max >= 60 ? 'chuva' : d.condicao} tam={130} />
      <div>
        <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 84, letterSpacing: -3, color: COR.texto, lineHeight: 1}}>
          {conta(d.min - 5, d.min, kNum)}° → {conta(d.max - 6, d.max, kNum)}°
        </div>
        <div style={{fontFamily: FONTE, fontWeight: 750, fontSize: 34, color: d.chance_max >= 60 ? COR.acento : COR.textoSuave, marginTop: 6}}>chuva: {d.chance_max}% de chance</div>
      </div>
    </div>
  </Moldura>
);
