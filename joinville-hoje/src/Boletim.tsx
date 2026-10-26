// O boletim JOINVILLE HOJE: um vídeo vertical montado a partir de uma edição (edicao.json).
// Topo fixo (marca, dia, progresso), o mapa da cidade no meio (a câmera vai até onde está cada informação),
// um cartão por bloco e a legenda palavra por palavra embaixo.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {COR, FONTE, MARCA, MONO, PERFIL, SEGURO, LEGENDA_BAIXO} from './estilo';
import {linhaDoTempo, FPS} from './linha';
import type {Bloco, Edicao, Palavra} from './tipos';
import {Mapa, CIDADE_URBANA, CENTRO, LESTE, JANELA_CHEIA, JANELA_TOPO, caixaDosBairros, type Caixa, type Janela, type Pin} from './componentes/Mapa';
import {CartaoCombustivel, CartaoLista, CartaoMare, CartaoPatrocinio, CartaoTema, CartaoTempo, entrada} from './componentes/Cartoes';

const MUNICIPIO: Caixa = {lon: [-49.05, -48.72], lat: [-26.45, -26.08]};
const c01 = (x: number) => Math.min(1, Math.max(0, x));
const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// enquadramento e janela do mapa de cada tipo de bloco
const camDe = (b: Bloco, anterior: Caixa): {caixa: Caixa; janela: Janela} => {
  switch (b.tipo) {
    case 'abertura':
      return {caixa: CIDADE_URBANA, janela: JANELA_CHEIA};
    case 'tempo':
      return {caixa: CIDADE_URBANA, janela: JANELA_TOPO};
    case 'mare':
      return {caixa: LESTE, janela: JANELA_TOPO};
    case 'lista': {
      const bs = b.itens.map((i) => i.bairro).filter((x): x is string => Boolean(x));
      return {caixa: bs.length ? caixaDosBairros(bs) : CIDADE_URBANA, janela: JANELA_TOPO};
    }
    case 'tema':
    case 'combustivel':
      return {caixa: CENTRO, janela: JANELA_TOPO};
    case 'patrocinio':
      return {caixa: anterior, janela: JANELA_TOPO};
    case 'encerramento':
      return {caixa: MUNICIPIO, janela: JANELA_CHEIA};
  }
};

// ---------- legenda (palavra por palavra, em blocos curtos) ----------
const blocosLegenda = (palavras: Palavra[]) => {
  const out: Palavra[][] = [];
  let cur: Palavra[] = [];
  palavras.forEach((p, i) => {
    cur.push(p);
    const prox = palavras[i + 1];
    const fim = /[.?!…:]$/.test(p.w);
    const pausa = prox && prox.s - p.e > 0.35;
    if (!prox || fim || pausa || cur.length >= 6 || (/[,;]$/.test(p.w) && cur.length >= 3)) {
      out.push(cur);
      cur = [];
    }
  });
  return out;
};
const Legenda: React.FC<{t: number; grupos: Palavra[][]}> = ({t, grupos}) => {
  let g = -1;
  for (let i = 0; i < grupos.length; i++) if (grupos[i][0].s <= t + 0.02) g = i;
  if (g < 0) return null;
  const b = grupos[g];
  const fim = b[b.length - 1].e;
  if (t > fim + 1.0) return null;
  const some = interpolate(t, [fim + 0.7, fim + 1.0], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const entra = interpolate(t - b[0].s, [0, 0.14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.botoesX, bottom: 1920 - LEGENDA_BAIXO, display: 'flex', justifyContent: 'center', opacity: (0.4 + 0.6 * entra) * some, transform: `translateY(${(1 - entra) * 12}px)`}}>
      <div style={{padding: '16px 28px', borderRadius: 18, background: COR.legendaFundo, fontFamily: FONTE, fontSize: 52, fontWeight: 650, lineHeight: 1.18, textAlign: 'center'}}>
        {b.map((p, i) => (
          <React.Fragment key={i}>
            <span style={{color: t >= p.s ? COR.texto : COR.legendaApagado}}>{p.w}</span>
            {i < b.length - 1 ? ' ' : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ---------- topo: marca, dia e progresso dos blocos ----------
const Topo: React.FC<{t: number; edicao: Edicao; faixas: {ini: number; fim: number}[]}> = ({t, edicao, faixas}) => {
  const [a, m, d] = edicao.data.split('-');
  return (
    <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.dir, top: SEGURO.topo + 4}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: COR.acento}} />
          <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: COR.texto}}>{MARCA}</div>
        </div>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: COR.textoSuave, padding: '8px 18px', borderRadius: 999, border: `2px solid ${COR.painelBorda}`}}>
          {edicao.diaSemana} · {d}/{m}/{a.slice(2)}
        </div>
      </div>
      <div style={{display: 'flex', gap: 6, marginTop: 18}}>
        {faixas.map((f, i) => (
          <div key={i} style={{flex: 1, height: 6, borderRadius: 3, background: COR.painelBorda, overflow: 'hidden'}}>
            <div style={{width: `${c01((t - f.ini) / (f.fim - f.ini)) * 100}%`, height: '100%', background: COR.acento}} />
          </div>
        ))}
      </div>
    </div>
  );
};

// hora de uma palavra dentro do bloco (para o elemento aparecer quando ela é dita); sem achar, uma fração do bloco
const quandoNo = (palavras: Palavra[], f: {ini: number; fim: number}, trecho: string, fracao: number) => {
  const alvo = trecho.split(/\s+/).map(norm).filter(Boolean);
  const dentro = palavras.filter((p) => p.s >= f.ini - 0.05 && p.s < f.fim);
  for (let i = 0; i <= dentro.length - alvo.length; i++) if (alvo.every((a, j) => norm(dentro[i + j].w) === a)) return dentro[i].s;
  return f.ini + (f.fim - f.ini) * fracao;
};

export const Boletim: React.FC<{edicao: Edicao; guia?: boolean}> = ({edicao, guia}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const {palavras, faixas, total} = useMemo(() => linhaDoTempo(edicao), [edicao]);
  const grupos = useMemo(() => blocosLegenda(palavras), [palavras]);
  const cams = useMemo(() => {
    const out: {caixa: Caixa; janela: Janela}[] = [];
    edicao.blocos.forEach((b, i) => out.push(camDe(b, i ? out[i - 1].caixa : CIDADE_URBANA)));
    return out;
  }, [edicao]);
  let i = 0;
  for (let k = 0; k < faixas.length; k++) if (faixas[k].ini <= t) i = k;
  const b = edicao.blocos[i];
  const f = faixas[i];
  const de = i ? cams[i - 1] : {caixa: MUNICIPIO, janela: JANELA_CHEIA};
  const kc = entrada(t, f.ini + 0.15, 0.5); // o cartão entra logo depois da troca
  const sai = 1 - interpolate(t, [f.fim - 0.25, f.fim], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const kCartao = kc * (i < faixas.length - 1 ? sai : 1);
  const q = (trecho: string, fracao: number) => quandoNo(palavras, f, trecho, fracao);

  // conteúdo por tipo de bloco
  let pins: Pin[] = [];
  let acesos: string[] = [];
  let chuva = 0;
  let rio = 0;
  let apagado = 0;
  let cartao: React.ReactNode = null;
  let centro: React.ReactNode = null;
  if (b.tipo === 'abertura') {
    const k = entrada(t, 0.2, 0.6);
    centro = (
      <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.botoesX, top: 860, textAlign: 'center', opacity: k, transform: `translateY(${(1 - k) * 30}px)`}}>
        <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 92, letterSpacing: -3, color: COR.texto, lineHeight: 1}}>Bom dia, Joinville</div>
        <div style={{fontFamily: MONO, fontSize: 26, letterSpacing: 4, color: COR.acento, marginTop: 16}}>O QUE MUDA NO SEU DIA</div>
      </div>
    );
  } else if (b.tipo === 'tempo') {
    const d = b.dados;
    // só desenha chuva quando algum período tem chuva de fato (mesma regra do texto do rascunho)
    const chove = d.periodos.some((p) => p.chuva_mm >= 0.5 || p.chance >= 60);
    chuva = chove ? c01(0.3 + d.chuva_mm / 15) : 0;
    cartao = <CartaoTempo d={d} k={kCartao} kPer={d.periodos.map((p, j) => entrada(t, q(p.nome, 0.25 + j * 0.15)))} kRodape={entrada(t, q('UV', 0.7))} />;
  } else if (b.tipo === 'mare') {
    rio = entrada(t, f.ini + 0.5, 1);
    cartao = <CartaoMare d={b.dados} k={kCartao} kCurva={interpolate(t, [f.ini + 0.3, f.ini + 2.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} kAltas={b.dados.altas.map((a, j) => entrada(t, q(`${Number(a.hora.slice(0, 2))}h${a.hora.slice(3, 5)}`, 0.35 + j * 0.25)))} />;
  } else if (b.tipo === 'combustivel') {
    apagado = 0.6;
    cartao = <CartaoCombustivel d={b.dados} k={kCartao} kItens={b.dados.itens.map((it, j) => entrada(t, q(it.nome.split(' ')[0], 0.2 + j * 0.15)))} />;
  } else if (b.tipo === 'lista') {
    const kItens = b.itens.map((it, j) => entrada(t, q(it.bairro ?? it.texto.split(' ').slice(0, 2).join(' '), 0.25 + j * 0.15)));
    pins = b.itens.flatMap((it, j) => (it.bairro ? [{bairro: it.bairro, k: kItens[j]}] : []));
    if (b.alerta) acesos = b.itens.map((it) => it.bairro).filter((x): x is string => Boolean(x));
    cartao = <CartaoLista rotulo={b.rotulo} titulo={b.titulo} itens={b.itens} fonte={b.fonte} alerta={b.alerta} k={kCartao} kItens={kItens} />;
  } else if (b.tipo === 'tema') {
    apagado = 0.6;
    cartao = <CartaoTema rotulo={b.rotulo} titulo={b.titulo} linhas={b.linhas} numero={b.numero} fonte={b.fonte} k={kCartao} kLinhas={b.linhas.map((l, j) => entrada(t, q(l.texto.split(' ')[0], 0.3 + j * 0.15)))} kNumero={entrada(t, q(b.numero?.valor ?? '', 0.25))} />;
  } else if (b.tipo === 'patrocinio') {
    apagado = 0.5;
    cartao = <CartaoPatrocinio nome={b.nome} frase={b.frase} imagem={b.imagem ? staticFile(`${edicao.pasta ?? edicao.data}/${b.imagem}`) : undefined} k={kCartao} />;
  } else if (b.tipo === 'encerramento') {
    const k = entrada(t, f.ini + 0.3, 0.6);
    centro = (
      <div style={{position: 'absolute', left: SEGURO.esq, right: 1080 - SEGURO.botoesX, top: 840, textAlign: 'center', opacity: k, transform: `translateY(${(1 - k) * 30}px)`}}>
        <div style={{display: 'inline-block', padding: '20px 36px', borderRadius: 24, background: COR.painel, border: `3px solid ${COR.acento}`}}>
          <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 56, letterSpacing: -1, color: COR.texto}}>Salva e manda pra quem</div>
          <div style={{fontFamily: FONTE, fontWeight: 900, fontSize: 56, letterSpacing: -1, color: COR.acento}}>sai cedo de casa</div>
          {PERFIL ? <div style={{fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: COR.textoSuave, marginTop: 12}}>{PERFIL}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${COR.fundoAlto} 0%, ${COR.fundo} 40%)`}}>
      <Mapa t={t} de={de.caixa} para={cams[i].caixa} janelaDe={de.janela} janela={cams[i].janela} ini={f.ini} acesos={acesos} kAcesos={entrada(t, f.ini + 0.4, 0.8)} pins={pins} chuva={chuva} rio={rio} apagado={apagado * kCartao} />
      {cartao}
      {centro}
      <Topo t={t} edicao={edicao} faixas={faixas} />
      <Legenda t={t} grupos={grupos} />
      {interpolate(t, [0, 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) > 0 ? <AbsoluteFill style={{background: '#05070A', opacity: interpolate(t, [0, 0.3], [1, 0], {extrapolateRight: 'clamp'})}} /> : null}
      {t > total - 0.5 ? <AbsoluteFill style={{background: '#05070A', opacity: interpolate(t, [total - 0.5, total], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}} /> : null}
      {edicao.narracao ? <Audio src={staticFile(`${edicao.pasta ?? edicao.data}/${edicao.narracao}`)} /> : null}
      {edicao.trilha ? <Audio src={staticFile(`${edicao.pasta ?? edicao.data}/${edicao.trilha}`)} loop volume={(fr) => interpolate(fr / FPS, [0, 0.5, total - 1.5, total], [0, 0.1, 0.1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} /> : null}
      {guia ? <GuiaReels /> : null}
    </AbsoluteFill>
  );
};

// pinta de vermelho o que a interface do Reels cobre (composição BoletimGuia, para conferir)
const GuiaReels: React.FC = () => {
  const {topo, base, esq, dir, botoesX, botoesY} = SEGURO;
  const veu = 'rgba(255,40,40,0.28)';
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: topo, background: veu}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: base, bottom: 0, background: veu}} />
      <div style={{position: 'absolute', left: 0, width: esq, top: topo, height: base - topo, background: veu}} />
      <div style={{position: 'absolute', left: dir, right: 0, top: topo, height: base - topo, background: veu}} />
      <div style={{position: 'absolute', left: botoesX, right: 0, top: botoesY, height: base - botoesY, background: veu}} />
    </AbsoluteFill>
  );
};
