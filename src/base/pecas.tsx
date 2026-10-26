import React, {useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {useThree} from '@react-three/fiber';
import {Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette} from '@react-three/postprocessing';
import {BlendFunction, ToneMappingMode} from 'postprocessing';
import {continueRender, delayRender, getInputProps, useCurrentFrame} from 'remotion';
import type {Tema} from './tema';
import {Material} from './materiais';
import {QA_LIGADO, qaPe, useQuadro} from './qa';
// na checagem automática a imagem só serve para medir pisca: sem desfoque, oclusão e brilho (bem mais rápido).
// QUALIDADE=previa (scripts/render.mjs) liga o mesmo modo leve para ver ritmo e enquadramento depressa.
const LEVE =
  QA_LIGADO ||
  (() => {
    try {
      return Boolean((getInputProps() as {leve?: boolean}).leve);
    } catch {
      return false;
    }
  })();
// fundo claro (estilos 'creme'): o brilho só pega luz de verdade (emissivo acima de 1) e a vinheta é leve, senão a imagem
// fica lavada, com cara de neblina
const CLARO = TEMA.nome === 'creme';
import {pePasso, type Pe} from './movimento';
import {TEMA} from './ativo';

// Peças 3D do canal: formas simples, cantos arredondados, foscas, sem rosto.
// Tudo parado; quem anima é a cena, pelo quadro.

export type V3 = [number, number, number];
// `sobe`: desloca a imagem para cima (em pixels), sem mudar a perspectiva. Usado para encaixar a cena na margem segura do Reels.
// `alvos` (v1.2): o que precisa ficar no quadro (preenchido por `camera()`/`enquadrar()`); a checagem confere.
// `ombro` (v1.2): plano por cima do ombro: o boneco da frente pode sair cortado de propósito.
export type Cam = {pos: V3; alvo: V3; fov: number; sobe?: number; alvos?: V3[]; ombro?: boolean};

// Mesma câmera que o R3F usa, montada fora do Canvas, para posicionar etiquetas HTML sobre pontos 3D.
export const projetar = (p: V3, cam: Cam, w: number, h: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.1, 400);
  c.position.set(...cam.pos);
  c.lookAt(...cam.alvo);
  if (cam.sobe) c.setViewOffset(w, h, 0, cam.sobe, w, h);
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return {x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h};
};

export const Camera: React.FC<Cam> = ({pos, alvo, fov, sobe}) => {
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const size = useThree((st) => st.size);
  const d = Math.hypot(pos[0] - alvo[0], pos[1] - alvo[1], pos[2] - alvo[2]);
  camera.position.set(...pos);
  camera.fov = fov;
  // v1.2: near/far proporcionais à distância (close de 30 cm não corta o objeto; plano geral não perde precisão)
  camera.near = Math.max(0.02, Math.min(0.1, d * 0.05));
  camera.far = Math.max(400, d * 6);
  if (sobe) camera.setViewOffset(size.width, size.height, 0, sobe, size.width, size.height);
  else if (camera.view?.enabled) camera.clearViewOffset();
  camera.updateProjectionMatrix();
  camera.lookAt(...alvo);
  return null;
};

export const Ambiente: React.FC = () => {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const [h] = useState(() => delayRender('ambiente 3D do Pix'));
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    continueRender(h);
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, h]);
  return null;
};

// ---------- Geometria arredondada (com cache: a mesma medida reaproveita a mesma geometria) ----------
// Cache com limite (v1.2): guarda os itens usados por último e LIBERA da memória (dispose) os mais antigos.
// Sem limite, uma peça que muda de tamanho a cada quadro (um corte que desce, uma barra que cresce) criava uma
// geometria nova por quadro e guardava todas: milhares de geometrias e a memória do computador estourava no render.
export const cacheLimitado = <T extends {dispose: () => void}>(max: number) => {
  const m = new Map<string, T>();
  return (k: string, criar: () => T): T => {
    let v = m.get(k);
    if (v) {
      m.delete(k); // volta para o fim (usado agora)
      m.set(k, v);
      return v;
    }
    v = criar();
    m.set(k, v);
    if (m.size > max) {
      const velho = m.keys().next().value as string;
      m.get(velho)?.dispose();
      m.delete(velho);
    }
    return v;
  };
};
const cacheCaixa = cacheLimitado<THREE.BufferGeometry>(600);
export const geoCaixa = (w: number, h: number, d: number, r = 0.05) => {
  const raio = Math.max(0.001, Math.min(r, w / 2, h / 2, d / 2) * 0.98);
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${raio.toFixed(3)}`;
  return cacheCaixa(k, () => new RoundedBoxGeometry(w, h, d, 3, raio));
};

// v1.1: o acabamento padrão ganhou textura (rugosidade e micro-relevo de plástico acetinado).
// Para outro material use <Material tipo="madeira|metal|vidro|papel|borracha|tecido|..." /> de './materiais'.
export const Fosco: React.FC<{cor: string; emissivo?: number}> = ({cor, emissivo = 0}) => <Material tipo="fosco" cor={cor} emissivo={emissivo} />;

type MeshProps = {position?: V3; rotation?: V3; scale?: number | V3};
export const Caixa: React.FC<MeshProps & {args: V3; raio?: number; cor: string; emissivo?: number; sombra?: boolean}> = ({args, raio = 0.05, cor, emissivo, sombra = true, ...p}) => (
  <mesh geometry={geoCaixa(args[0], args[1], args[2], raio)} castShadow={sombra} receiveShadow {...p}>
    <Fosco cor={cor} emissivo={emissivo} />
  </mesh>
);

// ---------- Céu em degradê (textura de fundo) ----------
const useCeu = (tema: Tema) =>
  useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 512;
    const ctx = cv.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, tema.ceu);
    g.addColorStop(1, tema.fundo);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [tema]);

const Ceu: React.FC<{tema: Tema}> = ({tema}) => {
  const tex = useCeu(tema);
  const scene = useThree((st) => st.scene);
  scene.background = tex;
  return null;
};

// Luz, céu e chão de cada tema. O chão some no horizonte pela névoa da mesma cor do fundo.
export const Palco: React.FC<{tema: Tema; alcance?: number; sombraArea?: number}> = ({tema, alcance = 60, sombraArea = 14}) => (
  <>
    <Ceu tema={tema} />
    <fog attach="fog" args={[tema.fundo, alcance * 0.4, alcance]} />
    <Ambiente />
    <hemisphereLight args={[tema.ceuLuz, tema.chao, tema.ambiente]} />
    {/* Luz principal quente, com sombra macia */}
    <directionalLight
      position={[-7, 13, 8]}
      intensity={tema.luz}
      color={tema.luzCor}
      castShadow
      shadow-mapSize={LEVE ? [1024, 1024] : [2048, 2048]}
      shadow-camera-near={1}
      shadow-camera-far={70}
      shadow-camera-left={-sombraArea}
      shadow-camera-right={sombraArea}
      shadow-camera-top={sombraArea}
      shadow-camera-bottom={-sombraArea}
      shadow-bias={-0.0003}
      shadow-normalBias={0.02}
      shadow-radius={5}
    />
    {/* Preenchimento frio do lado oposto e contraluz para destacar as bordas */}
    <directionalLight position={[8, 5, 6]} intensity={tema.luz * 0.22} color="#DDE8FF" />
    <directionalLight position={[2, 7, -10]} intensity={tema.luz * 0.45} color="#FFFFFF" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{qa: 'chao'}}>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color={tema.chao} roughness={1} metalness={0} />
    </mesh>
  </>
);

// O Remotion desenha o quadro uma vez, assim que a cena monta, antes do pós-processamento ficar pronto.
// Este reforço pede um segundo desenho no próximo quadro de animação e segura a captura até lá.
export const Reforco: React.FC = () => {
  const advance = useThree((st) => st.advance);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const h = delayRender(`pós-processamento do quadro ${frame}`);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      advance(performance.now());
      r2 = requestAnimationFrame(() => {
        advance(performance.now());
        continueRender(h);
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      continueRender(h);
    };
  }, [frame, advance]);
  return null;
};

// Pós-processamento: sombra de contato (AO), tom ACES e vinheta leve.
export const Acabamento: React.FC<{raioAO?: number}> = ({raioAO = 1.1}) => (
  <>
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={raioAO} intensity={2.6} distanceFalloff={0.9} aoSamples={12} denoiseSamples={4} denoiseRadius={8} color="#2A2520" halfRes />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.35} darkness={0.2} />
      <SMAA />
    </EffectComposer>
    <Reforco />
  </>
);

// ---------- Modo cinema (aprovado na maquininha, 09/10/2026) ----------
// Foco seletivo: distância (m) do ponto em foco, faixa nítida (m) e tamanho do desfoque.
export type Foco = {dist: number; faixa: number; bokeh?: number};
export const AcabamentoCinema: React.FC<{foco: Foco; raioAO?: number}> = ({foco, raioAO = 0.8}) =>
  LEVE ? (
    <Reforco />
  ) : (
  <>
    {/* v1.2: multisampling 0 + SMAA (com GL=angle o multisampling deixa a imagem granulada) e bloom só no que brilha
        de verdade (limiar alto: superfície clara não vira mancha branca estourada) */}
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={raioAO} intensity={2.6} distanceFalloff={0.9} aoSamples={12} denoiseSamples={4} denoiseRadius={8} color="#2A2520" halfRes />
      {/* foco AO VIVO (focusDistance/focusRange): passar worldFocusDistance recria o efeito inteiro a cada quadro (a câmera
          se move) e cada efeito novo reserva memória de tela cheia na placa de vídeo — num vídeo de 70 s isso enchia a
          memória do computador (100 GB) */}
      <DepthOfField focusDistance={foco.dist} focusRange={foco.faixa} bokehScale={foco.bokeh ?? 5} />
      <Bloom intensity={CLARO ? 0.3 : 0.4} luminanceThreshold={CLARO ? 1.05 : 0.9} luminanceSmoothing={0.08} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
      <Vignette offset={0.22} darkness={CLARO ? 0.22 : 0.55} />
      <SMAA />
    </EffectComposer>
    <Reforco />
  </>
);
// Foco padrão: no alvo da câmera, com a faixa nítida proporcional à distância (o que está bem na frente ou atrás borra).
export const focoAuto = (c: Cam, frac = 0.14, bokeh = 4.5): Foco => {
  const d = Math.hypot(c.pos[0] - c.alvo[0], c.pos[1] - c.alvo[1], c.pos[2] - c.alvo[2]);
  return {dist: d, faixa: Math.max(0.15, d * frac), bokeh};
};
// Transforma uma câmera comum em câmera de cinema: lente mais longa (afasta para manter o enquadramento),
// arco lento em volta do alvo e uma leve subida, tudo com aceleração suave ao longo da cena (k 0..1).
// `distMax`: não deixa a câmera recuar além disso (senão entra na neblina do palco); a lente se ajusta para manter o enquadramento.
export const cinematizar = (
  c: Cam,
  k: number,
  {lente = 0.72, arco = 0.16, sentido = 1, grua = 0.05, distMax = Infinity}: {lente?: number; arco?: number; sentido?: number; grua?: number; distMax?: number} = {},
): Cam => {
  const d0 = Math.hypot(c.pos[0] - c.alvo[0], c.pos[1] - c.alvo[1], c.pos[2] - c.alvo[2]);
  const t0 = Math.tan((c.fov * Math.PI) / 360);
  let esc = t0 / Math.tan((c.fov * lente * Math.PI) / 360);
  if (d0 * esc > Math.max(d0, distMax)) esc = Math.max(d0, distMax) / d0;
  const fov = (Math.atan(t0 / esc) * 360) / Math.PI;
  const d: V3 = [(c.pos[0] - c.alvo[0]) * esc, (c.pos[1] - c.alvo[1]) * esc, (c.pos[2] - c.alvo[2]) * esc];
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const ang = sentido * arco * (e - 0.5);
  const dist = Math.hypot(d[0], d[1], d[2]);
  return {
    ...c,
    fov,
    pos: [c.alvo[0] + d[0] * Math.cos(ang) - d[2] * Math.sin(ang), c.alvo[1] + d[1] + dist * grua * (e - 0.5), c.alvo[2] + d[0] * Math.sin(ang) + d[2] * Math.cos(ang)],
  };
};

// ---------- Boneco (v1.2) ----------
// Manequim de artista sem rosto: peças foscas (cabeça, peito, abdômen, quadril, membros afunilados) ligadas por
// articulações-bola num tom mais escuro. Altura ~1,95. É neutro por padrão (`tema.pessoa`): o acento fica para o que
// importa na cena, não para a pessoa.
// Pernas por cinemática inversa (a cena diz ONDE o pé está). Braços também (v1.2): `maoD: {alvo, k}` leva a mão até um
// ponto do mundo (maçaneta, botão, objeto) sem você calcular ângulo de ombro e cotovelo.
// Para andar, NÃO anime `passo` na mão: use `andar()` de `./movimento` e passe a `pose` que ele devolve.
// alvo em coordenadas do MUNDO; k 0..1 = quanto do caminho a mão já fez. `via`: ponto por onde a mão passa antes (para
// contornar a bancada, a porta…): sem ele a mão vai em linha reta e pode atravessar o que estiver no meio.
export type Alcance = {alvo: V3; k?: number; via?: V3};
export type Pose = {
  ombroE?: V3;
  ombroD?: V3;
  cotoveloE?: number;
  cotoveloD?: number;
  maoE?: Alcance; // (v1.2) mão esquerda até um ponto do mundo (tem prioridade sobre ombroE/cotoveloE)
  maoD?: Alcance; // (v1.2) mão direita até um ponto do mundo
  passo?: number; // (antigo) -1..1, pernas abertas paradas. Para andar use `fase`.
  fase?: number; // ciclos de passo andados (vem de `andar()`); o pé no chão fica travado
  passada?: number; // tamanho de um passo em metros (vem de `andar()`)
  intensidade?: number; // 0 parado .. 1 andando em velocidade de cruzeiro
  correndo?: boolean;
  agachar?: number; // 0..1 (vem de `pular()`; também serve para sentar/pegar algo no chão)
  bracosAlto?: number; // 0..1 braços para cima (pulo, comemoração)
  noAr?: boolean; // os dois pés fora do chão (pulo)
  pes?: Pe[]; // [esquerdo, direito] já resolvidos (vem de `andar()`); tem prioridade sobre `fase`
  cabeca?: V3; // rotação da cabeça
  tronco?: number; // inclinação do tronco (rot x)
};

// Medidas do corpo (não mude: as poses e o andar dependem delas)
const QUADRIL = 0.93; // altura do quadril em pé
const COXA = 0.45;
const CANELA = 0.4;
const TORNOZELO = 0.08; // do tornozelo à sola
const ALCANCE = COXA + CANELA - 0.004;
const OMBRO_X = 0.25;
const OMBRO_Y = 1.49;
const BRACO = 0.33; // ombro → cotovelo
const ANTEBRACO = 0.3; // cotovelo → punho
const MAO = 0.075; // punho → centro da palma
export const ALCANCE_BRACO = BRACO + ANTEBRACO + MAO;

// Membro afunilado (torno), com cache
const cacheTorno = new Map<string, THREE.BufferGeometry>();
const torno = (perfil: [number, number][]) => {
  const k = JSON.stringify(perfil);
  let g = cacheTorno.get(k);
  if (!g) {
    g = new THREE.LatheGeometry(
      perfil.map(([r, y]) => new THREE.Vector2(r, y)),
      32,
    );
    g.computeVertexNormals();
    cacheTorno.set(k, g);
  }
  return g;
};
// perfil de cima (y = 0) para baixo; raios em metros. Pontas em cúpula (encaixam na bola da articulação).
const membro = (r0: number, r1: number, comp: number, bojo = 0.1): [number, number][] => {
  const pts: [number, number][] = [[0.0001, 0]];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const r = r0 + (r1 - r0) * u + Math.sin(u * Math.PI) * bojo * r0;
    const tampa = Math.sin(Math.min(1, Math.min(u, 1 - u) * 6) * (Math.PI / 2));
    pts.push([Math.max(0.0001, r * (0.35 + 0.65 * tampa)), -comp * u]);
  }
  pts.push([0.0001, -comp]);
  return pts;
};
const escurece = (cor: string, f: number) => '#' + new THREE.Color(cor).lerp(new THREE.Color('#0B0D10'), f).getHexString();

const Peca: React.FC<{cor: string}> = ({cor}) => <Material tipo="fosco" cor={cor} />;
const Junta: React.FC<{p: V3; r: number; cor: string}> = ({p, r, cor}) => (
  <mesh position={p} castShadow receiveShadow>
    <sphereGeometry args={[r, 24, 18]} />
    <Material tipo="plastico" cor={cor} />
  </mesh>
);

const Braco: React.FC<{lado: 1 | -1; ombro: V3; cotovelo: number; cor: string; corJ: string}> = ({lado, ombro, cotovelo, cor, corJ}) => (
  <group position={[OMBRO_X * lado, OMBRO_Y, 0]} rotation={ombro}>
    <Junta p={[0, 0, 0]} r={0.068} cor={corJ} />
    <mesh geometry={torno(membro(0.058, 0.046, BRACO - 0.02))} position={[0, -0.01, 0]} castShadow receiveShadow>
      <Peca cor={cor} />
    </mesh>
    <group position={[0, -BRACO, 0]} rotation={[cotovelo, 0, 0]}>
      <Junta p={[0, 0, 0]} r={0.047} cor={corJ} />
      <mesh geometry={torno(membro(0.046, 0.034, ANTEBRACO - 0.02, 0.08))} position={[0, -0.01, 0]} castShadow receiveShadow>
        <Peca cor={cor} />
      </mesh>
      <group position={[0, -ANTEBRACO, 0]}>
        <Junta p={[0, 0, 0]} r={0.032} cor={corJ} />
        {/* Mão de manequim: palma em "luva" + polegar */}
        <mesh geometry={geoCaixa(0.072, 0.115, 0.036, 0.017)} position={[0, -MAO, 0.004]} castShadow receiveShadow>
          <Peca cor={cor} />
        </mesh>
        <mesh position={[0.036 * -lado, -0.045, 0.022]} rotation={[0.45, 0, 0.55 * lado]} castShadow>
          <capsuleGeometry args={[0.014, 0.04, 6, 12]} />
          <Peca cor={cor} />
        </mesh>
      </group>
    </group>
  </group>
);

// Perna por cinemática inversa: recebe onde o TORNOZELO deve estar (relativo ao quadril, em y/z) e a inclinação do pé.
const Perna: React.FC<{l: 1 | -1; alvoY: number; alvoZ: number; peInclina: number; cor: string; corJ: string; refPe: React.RefObject<THREE.Mesh | null>}> = ({
  l,
  alvoY,
  alvoZ,
  peInclina,
  cor,
  corJ,
  refPe,
}) => {
  const d = Math.min(ALCANCE, Math.max(0.2, Math.hypot(alvoY, alvoZ)));
  const beta = Math.atan2(-alvoZ, -alvoY); // direção quadril → tornozelo
  const gama = Math.acos(Math.min(1, Math.max(-1, (COXA * COXA + d * d - CANELA * CANELA) / (2 * COXA * d))));
  const coxa = beta - gama; // joelho para a frente
  const interno = Math.acos(Math.min(1, Math.max(-1, (COXA * COXA + CANELA * CANELA - d * d) / (2 * COXA * CANELA))));
  const joelho = Math.PI - interno;
  return (
    <group position={[0.1 * l, QUADRIL, 0]} rotation={[coxa, 0, 0]}>
      <Junta p={[0, 0, 0]} r={0.082} cor={corJ} />
      <mesh geometry={torno(membro(0.085, 0.06, COXA - 0.03))} position={[0, -0.015, 0]} castShadow receiveShadow>
        <Peca cor={cor} />
      </mesh>
      <group position={[0, -COXA, 0]} rotation={[joelho, 0, 0]}>
        <Junta p={[0, 0, 0]} r={0.06} cor={corJ} />
        <mesh geometry={torno(membro(0.062, 0.042, CANELA - 0.03, 0.14))} position={[0, -0.015, 0]} castShadow receiveShadow>
          <Peca cor={cor} />
        </mesh>
        {/* Pé com sola reta: fica plano no chão mesmo com a perna inclinada */}
        <group position={[0, -CANELA, 0]} rotation={[-(coxa + joelho) + peInclina, 0, 0]}>
          <Junta p={[0, 0, 0]} r={0.04} cor={corJ} />
          <mesh ref={refPe} geometry={geoCaixa(0.1, 0.065, 0.24, 0.03)} position={[0, -TORNOZELO + 0.0325, 0.05]} castShadow receiveShadow>
            <Peca cor={cor} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// Braço por cinemática inversa: `rel` = alvo da palma relativo ao ombro (no espaço do corpo). Devolve o ombro (Euler XYZ)
// e o cotovelo. O cotovelo sempre dobra para baixo e para fora (nunca para trás).
const clamp1 = (x: number) => Math.min(1, Math.max(-1, x));
export const ikBraco = (rel: V3, lado: 1 | -1): {ombro: V3; cotovelo: number} => {
  const L1 = BRACO;
  const L2 = ANTEBRACO + MAO;
  const v = new THREE.Vector3(...rel);
  const d = Math.min(Math.max(v.length(), 0.15), L1 + L2 - 0.004);
  const vh = v.lengthSq() > 1e-8 ? v.clone().normalize() : new THREE.Vector3(0, -1, 0);
  const A = Math.acos(clamp1((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const fi = Math.acos(clamp1((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  const dica = new THREE.Vector3(0.35 * lado, -1, -0.3).normalize();
  const p = dica.clone().addScaledVector(vh, -dica.dot(vh));
  if (p.lengthSq() < 1e-6) p.set(0, 0, -1).addScaledVector(vh, -vh.z);
  p.normalize();
  const u = vh.clone().multiplyScalar(Math.cos(A)).addScaledVector(p, Math.sin(A));
  const y = u.clone().negate();
  const z = vh.clone().addScaledVector(u, -vh.dot(u));
  if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(u, -u.z);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z), 'XYZ');
  return {ombro: [e.x, e.y, e.z], cotovelo: -(Math.PI - fi)};
};

export const Boneco: React.FC<{tema: Tema; pos: V3; rotY?: number; pose?: Pose; cor?: string; escala?: number; id?: string; children?: React.ReactNode}> = ({
  tema,
  pos,
  rotY = 0,
  pose = {},
  cor,
  escala = 1,
  id,
  children,
}) => {
  const c = cor ?? tema.pessoa;
  const cj = escurece(c, 0.32);
  const w = pose.intensidade ?? (pose.fase !== undefined ? 1 : 0);
  const correndo = Boolean(pose.correndo);
  const agachar = pose.agachar ?? 0;
  // Pés (relativos ao corpo): de `andar()` (pose.pes), do ciclo de passo (pose.fase) ou parados embaixo do quadril
  const pes = ([-1, 1] as const).map((l, i) => {
    const dado = pose.pes?.[i];
    if (dado) return {l, ...dado};
    if (pose.fase !== undefined) {
      const p = pePasso(pose.fase, l, pose.passada ?? 0.62, correndo);
      return {l, z: p.z, ergue: p.ergue * w, ponta: p.ponta * w, noChao: p.noChao, base: 0};
    }
    const abre = (pose.passo ?? 0) * 0.22 * l;
    return {l, z: abre, ergue: 0, ponta: 0, noChao: true, base: 0};
  });
  // Altura do quadril: a perna de apoio fica quase esticada (o corpo sobe e desce naturalmente a cada passo).
  const apoiados = pes.filter((p) => p.noChao);
  const baseAlta = Math.max(...(apoiados.length ? apoiados : pes).map((p) => p.base));
  let quadril = QUADRIL - 0.012 * w + baseAlta;
  for (const p of apoiados) {
    const zt = p.z - 0.055;
    quadril = Math.min(quadril, p.base + TORNOZELO + Math.sqrt(Math.max(0, ALCANCE * ALCANCE - zt * zt)));
  }
  if (correndo && w > 0 && apoiados.length === 0) quadril += 0.04 * w; // fase de voo da corrida
  quadril -= 0.36 * agachar;
  const desce = quadril - QUADRIL;
  const inclina = (pose.tronco ?? 0) + (correndo ? 0.16 : 0.05) * w + 0.35 * agachar;
  // Braços balançam ao contrário das pernas
  const balanco = (l: 1 | -1) => {
    const p = pes.find((q) => q.l === l)!;
    return (p.z / Math.max(0.2, pose.passada ?? 0.62)) * (correndo ? 0.9 : 0.42);
  };
  const alto = pose.bracosAlto ?? 0;
  let ombroE: V3 = pose.ombroE ?? [balanco(-1) - 2.7 * alto, 0, -0.06 - 0.25 * alto];
  let ombroD: V3 = pose.ombroD ?? [balanco(1) - 2.7 * alto, 0, 0.06 + 0.25 * alto];
  let cotE = pose.cotoveloE ?? (correndo ? -1.3 * w : -0.12 - 0.25 * w);
  let cotD = pose.cotoveloD ?? (correndo ? -1.3 * w : -0.12 - 0.25 * w);
  // Alcance (v1.2): leva a mão até um ponto do mundo
  const paraCorpo = (p: V3, lado: 1 | -1): V3 => {
    const dx = (p[0] - pos[0]) / escala;
    const dy = (p[1] - pos[1]) / escala;
    const dz = (p[2] - pos[2]) / escala;
    const cr = Math.cos(-rotY);
    const sr = Math.sin(-rotY);
    const x = dx * cr + dz * sr;
    const z0 = -dx * sr + dz * cr;
    const y0 = dy - desce - QUADRIL;
    const ca = Math.cos(-inclina);
    const sa = Math.sin(-inclina);
    const y = y0 * ca - z0 * sa + QUADRIL;
    const z = y0 * sa + z0 * ca;
    return [x - OMBRO_X * lado, y - OMBRO_Y, z];
  };
  const mistura = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // com `via`: 1ª metade leva a mão do repouso até o via; 2ª metade, do via até o alvo (sempre pelo IK)
  const alcancar = (m: Alcance, lado: 1 | -1, ombro0: V3, cot0: number): [V3, number] => {
    const k = Math.min(1, Math.max(0, m.k ?? 1));
    if (!m.via) {
      const ik = ikBraco(paraCorpo(m.alvo, lado), lado);
      return [mistura(ombro0, ik.ombro, k), cot0 + (ik.cotovelo - cot0) * k];
    }
    if (k < 0.5) {
      const ik = ikBraco(paraCorpo(m.via, lado), lado);
      const k2 = k * 2;
      return [mistura(ombro0, ik.ombro, k2), cot0 + (ik.cotovelo - cot0) * k2];
    }
    const ik = ikBraco(paraCorpo(mistura(m.via, m.alvo, (k - 0.5) * 2), lado), lado);
    return [ik.ombro, ik.cotovelo];
  };
  if (pose.maoE) [ombroE, cotE] = alcancar(pose.maoE, -1, ombroE, cotE);
  if (pose.maoD) [ombroD, cotD] = alcancar(pose.maoD, 1, ombroD, cotD);

  const refRaiz = useRef<THREE.Group>(null);
  const refPeE = useRef<THREE.Mesh>(null);
  const refPeD = useRef<THREE.Mesh>(null);
  const auto = useId();
  const nome = id ?? `boneco${auto}`;
  const q = useQuadro();
  useLayoutEffect(() => {
    if (!QA_LIGADO) return;
    const noAr = Boolean(pose.noAr);
    if (refPeE.current) qaPe(q, nome, 'E', refPeE.current, !noAr && pes[0].noChao);
    if (refPeD.current) qaPe(q, nome, 'D', refPeD.current, !noAr && pes[1].noChao);
  });

  return (
    <group ref={refRaiz} position={pos} rotation={[0, rotY, 0]} scale={escala} userData={{qa: 'boneco', id: nome}}>
      <group position={[0, desce, 0]}>
        {pes.map((p) => (
          <Perna
            key={p.l}
            l={p.l}
            alvoY={p.base + TORNOZELO + p.ergue - quadril}
            alvoZ={p.z - 0.055}
            peInclina={p.ponta}
            cor={c}
            corJ={cj}
            refPe={p.l < 0 ? refPeE : refPeD}
          />
        ))}
        <group rotation={[inclina, 0, 0]} position={[0, QUADRIL, 0]}>
          <group position={[0, -QUADRIL, 0]}>
            {/* Quadril, cintura (bola), abdômen, peito: o tronco segmentado do manequim de artista */}
            <mesh position={[0, 0.965, 0]} scale={[1, 0.62, 0.74]} castShadow receiveShadow>
              <sphereGeometry args={[0.19, 32, 24]} />
              <Peca cor={c} />
            </mesh>
            <Junta p={[0, 1.075, 0]} r={0.1} cor={cj} />
            <mesh position={[0, 1.16, 0]} scale={[1, 1, 0.76]} castShadow receiveShadow>
              <capsuleGeometry args={[0.125, 0.06, 10, 28]} />
              <Peca cor={c} />
            </mesh>
            <mesh geometry={geoCaixa(0.44, 0.3, 0.27, 0.12)} position={[0, 1.39, 0]} castShadow receiveShadow>
              <Peca cor={c} />
            </mesh>
            {/* Pescoço e cabeça (oval, sem rosto) */}
            <Junta p={[0, 1.585, 0]} r={0.05} cor={cj} />
            <group position={[0, 1.775, 0.008]} rotation={pose.cabeca ?? [0, 0, 0]}>
              <mesh scale={[0.84, 1.1, 0.94]} castShadow receiveShadow userData={{parte: 'cabeca'}}>
                <sphereGeometry args={[0.15, 40, 30]} />
                <Peca cor={c} />
              </mesh>
            </group>
            <Braco lado={-1} ombro={ombroE} cotovelo={cotE} cor={c} corJ={cj} />
            <Braco lado={1} ombro={ombroD} cotovelo={cotD} cor={c} corJ={cj} />
          </group>
        </group>
      </group>
      {children}
    </group>
  );
};

// ---------- Celular ----------
export const Celular: React.FC<{tema: Tema; pos: V3; rot?: V3; brilho?: number}> = ({tema, pos, rot = [0, 0, 0], brilho = 1}) => (
  <group position={pos} rotation={rot}>
    <mesh geometry={geoCaixa(0.085, 0.17, 0.012, 0.012)} castShadow>
      <meshStandardMaterial color={tema.tinta} roughness={0.3} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0, 0.0065]}>
      <planeGeometry args={[0.074, 0.156]} />
      <meshStandardMaterial color={tema.acento} emissive={tema.acento} emissiveIntensity={0.9 * brilho} roughness={0.4} />
    </mesh>
  </group>
);

// ---------- Placa com texto (textura de canvas) ----------
export type Linha = {t: string; tam: number; cor: string; peso?: number};
// textura de texto com limite: um visor que muda (contagem, relógio) não acumula uma textura por quadro
const cachePlaca = cacheLimitado<THREE.CanvasTexture>(48);
const usePlacaTex = (linhas: Linha[], fundo: string, w = 1024, h = 512) =>
  cachePlaca(`${JSON.stringify(linhas)}|${fundo}|${w}|${h}`, () => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, w, h);
    const total = linhas.reduce((a, l) => a + l.tam * 1.15, 0);
    let y = (h - total) / 2;
    for (const l of linhas) {
      ctx.font = `${l.peso ?? 800} ${l.tam}px "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = l.cor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(l.t, w / 2, y);
      y += l.tam * 1.15;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });

export const Placa: React.FC<{tema: Tema; pos: V3; rot?: V3; larg: number; alt: number; linhas: Linha[]; fundo?: string}> = ({tema, pos, rot = [0, 0, 0], larg, alt, linhas, fundo}) => {
  const tex = usePlacaTex(linhas, fundo ?? tema.branco, 1024, Math.round((1024 * alt) / larg));
  return (
    <group position={pos} rotation={rot}>
      <Caixa args={[larg, alt, 0.04]} raio={0.02} cor={tema.tinta} />
      <mesh position={[0, 0, 0.024]}>
        <planeGeometry args={[larg * 0.94, alt * 0.88]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  );
};

// ---------- Pastel (meia-lua com borda) ----------
export const Pastel: React.FC<{tema: Tema; pos: V3; rot?: V3; escala?: number}> = ({tema, pos, rot = [0, 0, 0], escala = 1}) => (
  <group position={pos} rotation={rot} scale={escala}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.42]} castShadow receiveShadow>
      <cylinderGeometry args={[0.16, 0.16, 0.06, 28, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color={tema.areia} roughness={0.55} />
    </mesh>
  </group>
);

// ---------- Barraca de feira ----------
// `linhas` troca o texto da placa e `itens` troca os pastéis do balcão (sem eles, fica a barraca de pastel do Pix).
export const Barraca: React.FC<{tema: Tema; pos: V3; rotY?: number; vento?: number; linhas?: Linha[]; itens?: React.ReactNode}> = ({tema, pos, rotY = 0, vento = 0, linhas, itens}) => {
  const L = 2.8;
  const listras = 10;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Caixa args={[L, 0.08, 1.0]} raio={0.03} cor={tema.branco} position={[0, 0.95, 0]} />
      <Caixa args={[L - 0.04, 0.85, 0.04]} raio={0.02} cor={tema.branco} position={[0, 0.5, 0.48]} />
      {[-1, 1].map((l) => (
        <group key={l}>
          <mesh position={[(L / 2 - 0.05) * l, 1.25, 0.45]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 2.5, 12]} />
            <Fosco cor={tema.tinta} />
          </mesh>
          <mesh position={[(L / 2 - 0.05) * l, 1.4, -0.45]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 2.8, 12]} />
            <Fosco cor={tema.tinta} />
          </mesh>
        </group>
      ))}
      {/* Toldo listrado, inclinado para a frente, ondulando de leve com o vento */}
      <group position={[0, 2.62, 0]} rotation={[0.28 + vento * 0.02, 0, 0]}>
        {Array.from({length: listras}).map((_, i) => (
          <Caixa key={i} args={[L / listras, 0.03, 1.25]} raio={0.012} cor={i % 2 === 0 ? tema.tinta : tema.branco} position={[-L / 2 + (L / listras) * (i + 0.5), Math.sin(i * 0.9 + vento * 3) * 0.008, 0]} />
        ))}
        {Array.from({length: listras}).map((_, i) => (
          <group key={`b${i}`} position={[-L / 2 + (L / listras) * (i + 0.5), -0.02, 0.62]} rotation={[Math.sin(vento * 4 + i) * 0.08, 0, 0]}>
            <Caixa args={[L / listras, 0.18, 0.02]} raio={0.008} cor={i % 2 === 0 ? tema.tinta : tema.branco} position={[0, -0.09, 0]} />
          </group>
        ))}
      </group>
      {itens ??
        [
          [-0.9, 0.1, 0.3],
          [-0.55, 0.15, -0.2],
          [-0.25, 0.05, 0.6],
          [0.15, 0.2, -0.4],
          [0.5, 0.0, 0.1],
        ].map(([x, z, r], i) => <Pastel key={i} tema={tema} pos={[x, 1.01, z]} rot={[0, r, 0]} />)}
      <Caixa args={[0.55, 0.035, 0.4]} raio={0.012} cor={tema.tinta} position={[0.95, 1.0, 0.05]} />
      <Placa
        tema={tema}
        pos={[-0.55, 2.14, 0.58]}
        rot={[0.05, 0, Math.sin(vento * 2) * 0.03]}
        larg={1.1}
        alt={0.42}
        linhas={
          linhas ?? [
            {t: 'PASTEL', tam: 150, cor: '#1E1D1B'},
            {t: 'R$ 12', tam: 120, cor: tema.acento},
          ]
        }
        fundo="#FBF8F2"
      />
    </group>
  );
};

// ---------- Gaveteiro (o diretório de chaves) ----------
export const Gaveteiro: React.FC<{tema: Tema; pos: V3; cols: number; linhas: number; destaque: [number, number]; abertura: number; piscando?: [number, number][]}> = ({
  tema,
  pos,
  cols,
  linhas,
  destaque,
  abertura,
  piscando = [],
}) => {
  const W = 0.62;
  const H = 0.36;
  const gap = 0.04;
  const {frentes, puxadores} = useMemo(() => {
    const geo = geoCaixa(W, H, 0.5, 0.035);
    const mat = new THREE.MeshStandardMaterial({color: tema.branco, roughness: 0.72, envMapIntensity: 0.5});
    const frentes = new THREE.InstancedMesh(geo, mat, cols * linhas);
    const pgeo = geoCaixa(0.22, 0.04, 0.05, 0.018);
    const pmat = new THREE.MeshStandardMaterial({color: tema.tinta, roughness: 0.5});
    const puxadores = new THREE.InstancedMesh(pgeo, pmat, cols * linhas);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < linhas; j++) {
        const x = (i - (cols - 1) / 2) * (W + gap);
        const y = H / 2 + j * (H + gap);
        const esc = i === destaque[0] && j === destaque[1] ? 0 : 1;
        m.makeScale(esc, esc, esc).setPosition(x, y, 0);
        frentes.setMatrixAt(k, m);
        m.makeScale(esc, esc, esc).setPosition(x, y + 0.04, 0.27);
        puxadores.setMatrixAt(k, m);
        k++;
      }
    }
    frentes.castShadow = true;
    frentes.receiveShadow = true;
    return {frentes, puxadores};
  }, [tema, cols, linhas, destaque]);
  const xy = (c: number, l: number): V3 => [(c - (cols - 1) / 2) * (W + gap), H / 2 + l * (H + gap), 0];
  const d = xy(destaque[0], destaque[1]);
  return (
    <group position={pos}>
      <primitive object={frentes} />
      <primitive object={puxadores} />
      {/* Gavetas que piscam durante a busca */}
      {piscando.map(([c, l], i) => {
        const p = xy(c, l);
        return <Caixa key={i} args={[W + 0.004, H + 0.004, 0.5]} raio={0.035} cor={tema.acento} emissivo={0.35} position={[p[0], p[1], 0.03]} sombra={false} />;
      })}
      <group position={[d[0], d[1], abertura]}>
        <Caixa args={[W, H, 0.5]} raio={0.035} cor={tema.acento} emissivo={0.15} />
        <Caixa args={[0.22, 0.04, 0.05]} raio={0.018} cor={tema.tinta} position={[0, 0.04, 0.27]} />
        <Caixa args={[W * 0.92, H * 0.8, 0.6]} raio={0.02} cor={tema.branco} position={[0, 0, -0.55]} />
        {/* Fichas dentro da gaveta */}
        {[0, 1, 2, 3].map((i) => (
          <Caixa key={i} args={[W * 0.8, H * 0.62, 0.012]} raio={0.004} cor={i === 0 ? tema.acento : tema.branco} position={[0, 0.02, -0.32 - i * 0.07]} />
        ))}
      </group>
    </group>
  );
};

// ---------- Moeda e pilha ----------
export const Moeda: React.FC<{tema: Tema; pos: V3; rot?: V3; r?: number}> = ({tema, pos, rot = [0, 0, 0], r = 0.2}) => (
  <group position={pos} rotation={rot}>
    <mesh castShadow>
      <cylinderGeometry args={[r, r, r * 0.26, 40]} />
      <meshStandardMaterial color={tema.acento} roughness={0.38} metalness={0.2} />
    </mesh>
    <mesh position={[0, r * 0.131, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.62, r * 0.7, 40]} />
      <meshStandardMaterial color={tema.tinta} transparent opacity={0.22} />
    </mesh>
    <mesh position={[0, -r * 0.131, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.62, r * 0.7, 40]} />
      <meshStandardMaterial color={tema.tinta} transparent opacity={0.22} />
    </mesh>
  </group>
);

export const Pilhas: React.FC<{tema: Tema; pos: V3; alturas: number[]; quique?: number}> = ({tema, pos, alturas, quique = 0}) => (
  <group position={pos} scale={[1, 1 - quique * 0.12, 1]}>
    {alturas.map((n, i) => {
      const x = ((i % 3) - 1) * 0.48;
      const z = (Math.floor(i / 3) - 0.5) * 0.5;
      return (
        <group key={i}>
          {Array.from({length: n}).map((_, k) => (
            <Moeda key={k} tema={tema} pos={[x, 0.026 + k * 0.054, z]} rot={[0, k * 0.7, 0]} />
          ))}
        </group>
      );
    })}
  </group>
);

// ---------- Cofre (a conta de um banco dentro do Banco Central) ----------
export const Cofre: React.FC<{tema: Tema; pos: V3; rotY?: number}> = ({tema, pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Caixa args={[1.7, 0.6, 1.5]} raio={0.08} cor={tema.branco} position={[0, 0.3, 0]} />
    <Caixa args={[1.76, 0.07, 1.56]} raio={0.03} cor={tema.tinta} position={[0, 0.035, 0]} />
  </group>
);

// ---------- Prédio do Banco Central (lâmina alta com pilares) ----------
export const Predio: React.FC<{tema: Tema; pos: V3; alt?: number; escuro?: boolean}> = ({tema, pos, alt = 9, escuro}) => (
  <group position={pos}>
    <Caixa args={[7, alt, 1.2]} raio={0.12} cor={escuro ? tema.tinta : tema.nome === 'creme' ? '#DCD5C7' : '#1B212B'} position={[0, alt / 2, 0]} />
    {Array.from({length: 13}).map((_, i) => (
      <Caixa key={i} args={[0.12, alt, 0.12]} raio={0.04} cor={escuro ? '#3A3936' : tema.branco} position={[-3.3 + i * 0.55, alt / 2, 0.62]} />
    ))}
  </group>
);

// ---------- Onda no chão (pulso que se espalha) ----------
// v1.2: entra e sai em fade (nada surge do nada) e não briga com o chão (polygonOffset, sem escrever profundidade).
const geoAnel = new THREE.RingGeometry(0.9, 1, 96);
export const Onda: React.FC<{pos: V3; k: number; cor: string; raio?: number}> = ({pos, k, cor, raio = 1.6}) => {
  if (k <= 0 || k >= 1) return null;
  const r = 0.2 + k * raio;
  const op = Math.min(1, k * 8) * (1 - k) * 0.9;
  return (
    <mesh position={[pos[0], pos[1] + 0.012, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={r} geometry={geoAnel} renderOrder={5} userData={{qa: 'overlay'}}>
      <meshBasicMaterial color={cor} transparent opacity={op} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} toneMapped={false} />
    </mesh>
  );
};

// ---------- Vapor (pastel quentinho) ----------
export const Vapor: React.FC<{pos: V3; t: number; cor?: string}> = ({pos, t, cor = '#FFFFFF'}) => (
  <>
    {[0, 1, 2].map((i) => {
      const fase = (t * 0.55 + i / 3) % 1;
      return (
        <mesh key={i} position={[pos[0] + Math.sin(fase * 6 + i) * 0.04, pos[1] + fase * 0.45, pos[2]]} scale={0.03 + fase * 0.05}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color={cor} transparent opacity={(1 - fase) * 0.55} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);

// Partículas de poeira/luz flutuando devagar (dão profundidade).
// v1.2: o tamanho acompanha o `raio` da nuvem (numa cena de 30 cm elas são grãos, não bolas), `escala` multiplica.
// Prefira a poeira automática do `CanvasCinema` (fica atrás do assunto); use esta só para efeito local (faísca, vapor).
const geoPonto = new THREE.SphereGeometry(1, 14, 10);
export const Particulas: React.FC<{t: number; centro: V3; raio: number; n?: number; cor?: string; escala?: number; opacidade?: number}> = ({
  t,
  centro,
  raio,
  n = 40,
  cor = '#C9D6E8',
  escala = 1,
  opacidade = 0.5,
}) => {
  const base = useMemo(() => {
    let k = 3;
    const rnd = () => {
      k = (k * 16807) % 2147483647;
      return (k % 10000) / 10000;
    };
    return Array.from({length: n}, () => ({x: (rnd() - 0.5) * 2, y: rnd(), z: (rnd() - 0.5) * 2, v: 0.05 + rnd() * 0.12, r: 0.004 + rnd() * 0.007, f: rnd() * 6}));
  }, [n]);
  const m = new THREE.Object3D();
  const preparar = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    base.forEach((p, i) => {
      const y = (p.y + t * p.v) % 1;
      m.position.set(centro[0] + p.x * raio + Math.sin(t * 0.5 + p.f) * raio * 0.07, centro[1] - raio * 0.3 + y * raio * 0.9, centro[2] + p.z * raio);
      m.scale.setScalar(p.r * raio * escala * Math.sin(Math.PI * y));
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  return (
    <instancedMesh ref={preparar} args={[geoPonto, undefined, n]} userData={{qa: 'particula'}} frustumCulled={false}>
      <meshBasicMaterial color={cor} transparent opacity={opacidade} toneMapped={false} depthWrite={false} />
    </instancedMesh>
  );
};
