import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Caixa, Material, Realce, Solido, TEMA as tema, CORES, type V3, type TipoMaterial} from '../../base/kit';

// Peças 3D do vídeo do narguilé. Medidas reais em metros, origem no tampo da mesa (centro da base do vaso).
// Cada parte de revolução é um "perfil de parede" fechado (r, y): vira o sólido (LatheGeometry) e, no corte,
// a face serrada com hachura (ShapeGeometry do mesmo perfil). Assim o corte sempre bate com a peça.

type Perfil = [number, number][];
const mistura = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
export const COR_TABACO = mistura(tema.areia, CORES.escuro, 0.78);
export const COR_COCO = mistura(tema.areia, CORES.escuro, 0.35);

// ---------- Medidas ----------
export const AGUA_Y = 0.12; // nível da água
export const PONTA_Y = 0.09; // ponta do tubo central (3 cm abaixo da água)
export const GARGALO_Y = 0.262; // boca do vaso (onde fica a borracha)
export const PRATO_Y = 0.578;
export const TABACO_TOPO = 0.652;
export const ALU_Y = 0.6635; // papel-alumínio
export const CARVAO_Y = ALU_Y + 0.0008 + 0.012; // centro dos cubos de carvão
export const PORTA_MANGUEIRA: V3 = [0.04, 0.32, 0];
export const VALVULA: V3 = [-0.046, 0.3, 0]; // base da válvula de alívio
export const BOLINHA_Y = 0.318;
export const ALTURA = 0.7;
export const CARVOES: {p: V3; r: number}[] = [
  {p: [-0.021, CARVAO_Y, -0.009], r: 0.3},
  {p: [0.02, CARVAO_Y, -0.011], r: -0.2},
  {p: [0.0, CARVAO_Y, 0.02], r: 0.7},
];
// caminho da mangueira: sai da porta, desce até a mesa e volta para a frente; termina na piteira
export const CAMINHO_MANGUEIRA: V3[] = [
  [0.04, 0.32, 0],
  [0.09, 0.315, 0.01],
  [0.16, 0.25, 0.04],
  [0.215, 0.1, 0.09],
  [0.23, 0.02, 0.16],
  [0.19, 0.012, 0.235],
  [0.1, 0.012, 0.26],
];
export const PITEIRA_A: V3 = [0.1, 0.012, 0.26];
export const PITEIRA_B: V3 = [-0.01, 0.016, 0.262];

const VASO: Perfil = [
  [0.0, 0.0], [0.09, 0.0], [0.12, 0.04], [0.13, 0.09], [0.12, 0.15], [0.08, 0.21], [0.042, 0.24], [0.037, GARGALO_Y],
  [0.033, GARGALO_Y], [0.038, 0.24], [0.076, 0.21], [0.116, 0.15], [0.126, 0.09], [0.116, 0.042], [0.087, 0.005], [0.0, 0.005],
];
const AGUA: Perfil = [[0.0, 0.006], [0.086, 0.006], [0.114, 0.042], [0.124, 0.09], [0.1215, AGUA_Y], [0.0, AGUA_Y]];
const AR: Perfil = [[0.0, AGUA_Y + 0.001], [0.121, AGUA_Y + 0.001], [0.114, 0.15], [0.075, 0.21], [0.036, 0.24], [0.031, GARGALO_Y - 0.002], [0.0, GARGALO_Y - 0.002]];
const TUBO: Perfil = [[0.006, PONTA_Y], [0.009, PONTA_Y], [0.009, 0.266], [0.006, 0.266]];
const CORPO: Perfil = [[0.006, 0.267], [0.02, 0.267], [0.022, 0.3], [0.017, 0.34], [0.02, 0.45], [0.015, 0.55], [0.02, 0.5765], [0.006, 0.5765]];
const PRATO: Perfil = [[0.021, 0.5768], [0.084, PRATO_Y], [0.088, 0.584], [0.021, 0.584]];
const FORNILHO: Perfil = [[0.006, 0.5845], [0.016, 0.5845], [0.03, 0.598], [0.046, 0.642], [0.05, 0.662], [0.043, 0.662], [0.037, 0.632], [0.012, 0.613], [0.006, 0.613]];
const TABACO: Perfil = [[0.0, 0.6135], [0.0118, 0.6135], [0.0366, 0.632], [0.0405, TABACO_TOPO], [0.0, TABACO_TOPO]];

const geoLathe = (p: Perfil, seg = 48) => new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const geoFace = (p: Perfil, lado: 1 | -1) => {
  const s = new THREE.Shape(p.map(([r, y]) => new THREE.Vector2(r * lado, y)));
  return new THREE.ShapeGeometry(s);
};

// ---------- Hachura da face serrada (listras diagonais em neutros) ----------
let texHach: THREE.CanvasTexture | null = null;
const hachura = () => {
  if (texHach) return texHach;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = CORES.escuro;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = CORES.cinza;
  g.lineWidth = 10;
  for (let i = -128; i < 256; i += 32) {
    g.beginPath();
    g.moveTo(i, 128);
    g.lineTo(i + 128, 0);
    g.stroke();
  }
  texHach = new THREE.CanvasTexture(cv);
  texHach.colorSpace = THREE.SRGBColorSpace;
  texHach.wrapS = texHach.wrapT = THREE.RepeatWrapping;
  texHach.repeat.set(70, 70); // ~1,4 cm por quadro de listras
  return texHach;
};
const FaceCorte: React.FC<{perfil: Perfil; cor?: string; opacidade?: number}> = ({perfil, cor, opacidade = 1}) => {
  const geos = useMemo(() => [geoFace(perfil, 1), geoFace(perfil, -1)], [perfil]);
  return (
    <group position={[0, 0, 0.0006]} userData={{semCorte: true}}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} userData={{semCorte: true}}>
          {cor ? (
            <meshStandardMaterial color={cor} transparent={opacidade < 1} opacity={opacidade} depthWrite={opacidade >= 1} roughness={0.6} side={THREE.DoubleSide} />
          ) : (
            <meshStandardMaterial map={hachura()} roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
          )}
        </mesh>
      ))}
    </group>
  );
};

// ---------- Corte: tira a metade da frente (z > 0) de tudo o que está dentro ----------
const Cortado: React.FC<{ativo: boolean; children: React.ReactNode}> = ({ativo, children}) => {
  const gl = useThree((st) => st.gl);
  const ref = useRef<THREE.Group>(null);
  const planos = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)], []);
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    ref.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m || o.userData.semCorte) return;
      for (const mat of Array.isArray(m) ? m : [m]) {
        const quer = ativo ? planos : null;
        if (mat.clippingPlanes !== quer) {
          mat.clippingPlanes = quer;
          mat.side = ativo ? THREE.DoubleSide : THREE.FrontSide;
          mat.needsUpdate = true;
        }
      }
    });
  });
  return <group ref={ref}>{children}</group>;
};

const Parte: React.FC<{perfil: Perfil; tipo: TipoMaterial; cor: string; corte: boolean; face?: string; sombra?: boolean; opacidade?: number}> = ({perfil, tipo, cor, corte, face, sombra = true, opacidade}) => {
  const geo = useMemo(() => geoLathe(perfil), [perfil]);
  return (
    <>
      <mesh geometry={geo} castShadow={sombra} receiveShadow>
        <Material tipo={tipo} cor={cor} opacidade={opacidade} />
      </mesh>
      {corte ? <FaceCorte perfil={perfil} cor={face} /> : null}
    </>
  );
};

// ---------- Volumes de dentro (água e fumaça) ----------
const Volume: React.FC<{perfil: Perfil; cor: string; opacidade: number; corte: boolean}> = ({perfil, cor, opacidade, corte}) => {
  const geo = useMemo(() => geoLathe(perfil), [perfil]);
  if (opacidade <= 0.01) return null;
  return (
    <group userData={{qa: 'overlay'}}>
      <mesh geometry={geo} renderOrder={2}>
        <meshStandardMaterial color={cor} transparent opacity={opacidade} depthWrite={false} roughness={0.3} />
      </mesh>
      {corte ? <FaceCorte perfil={perfil} cor={cor} opacidade={Math.min(1, opacidade * 1.3)} /> : null}
    </group>
  );
};

// ---------- Peças soltas (as cenas de montagem usam uma a uma dentro de <Entra>) ----------
export const Tabaco: React.FC<{corte?: boolean; calor?: number}> = ({corte = false, calor = 0}) => (
  <Realce k={calor} cor={tema.acento} forca={0.18}>
    <Parte perfil={TABACO} tipo="papel" cor={COR_TABACO} corte={corte} face={mistura(COR_TABACO, CORES.escuro, 0.3)} />
  </Realce>
);

const FUROS: V3[] = (() => {
  const out: V3[] = [];
  for (let a = 0; a < 3; a++)
    for (let i = 0; i < [1, 6, 11][a]; i++) {
      const r = [0, 0.016, 0.031][a];
      const ang = (i / [1, 6, 11][a]) * Math.PI * 2 + a * 0.4;
      out.push([Math.cos(ang) * r, 0, Math.sin(ang) * r]);
    }
  return out;
})();
export const Aluminio: React.FC = () => (
  <group position={[0, ALU_Y, 0]}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.054, 0.054, 0.0015, 48]} />
      <Material tipo="metal" cor={CORES.claro} />
    </mesh>
    {FUROS.map((p, i) => (
      <mesh key={i} position={[p[0], 0.0009, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0022, 12]} />
        <meshStandardMaterial color={CORES.fundo} roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    ))}
  </group>
);
export const FUROS_ALU = FUROS.map((p) => [p[0], ALU_Y, p[2]] as V3);

// brasa: 0 apagado .. 1 aceso. O pulso é lento (≈ 0,3 vez por segundo), nunca pisca.
export const Carvao: React.FC<{i: number; brasa: number}> = ({i, brasa}) => {
  const c = CARVOES[i];
  return (
    <Realce k={brasa} cor={tema.acento} forca={0.55}>
      <mesh position={c.p} rotation={[0, c.r, 0]} castShadow>
        <boxGeometry args={[0.024, 0.024, 0.024]} />
        <Material tipo="borracha" cor={CORES.escuro} />
      </mesh>
    </Realce>
  );
};

const Mangueira: React.FC = () => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(CAMINHO_MANGUEIRA.map((p) => new THREE.Vector3(...p))), 80, 0.0085, 12, false), []);
  const piteira = useMemo(() => {
    const a = new THREE.Vector3(...PITEIRA_A);
    const b = new THREE.Vector3(...PITEIRA_B);
    const d = b.clone().sub(a);
    return {pos: a.clone().add(b).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), L: d.length()};
  }, []);
  return (
    <group userData={{semCorte: true}}>
      <mesh geometry={geo} castShadow userData={{semCorte: true}}>
        <Material tipo="borracha" cor={CORES.medio} />
      </mesh>
      <mesh position={piteira.pos} quaternion={piteira.q} castShadow userData={{semCorte: true}}>
        <cylinderGeometry args={[0.0075, 0.0095, piteira.L, 20]} />
        <Material tipo="metal" cor={CORES.cinza} />
      </mesh>
    </group>
  );
};

// ---------- O narguilé inteiro ----------
export type EstadoNarguile = {
  corte?: boolean; // aberto ao meio (metade da frente some, faces com hachura)
  brasa?: number; // 0..1
  nevoa?: number; // 0..1 fumaça no espaço vazio do vaso
  calor?: number; // 0..1 o tabaco esquenta (brilho baixo, sem chama)
  folga?: number; // 0..1 a borracha afrouxa (sobe e abre uma fresta)
  bolinha?: number; // 0..1 a bolinha da válvula sobe
};
// a cena de montagem embrulha cada peça do topo num <Entra> (o padrão é a peça já no lugar)
type Embrulho = (n: React.ReactNode, i: number) => React.ReactNode;
export type Montagem = {tabaco?: Embrulho; aluminio?: Embrulho; carvao?: Embrulho};
const pronto: Embrulho = (n) => n;
export const Narguile: React.FC<{pos: V3; estado?: EstadoNarguile; montagem?: Montagem; children?: React.ReactNode}> = ({pos, estado = {}, montagem = {}, children}) => {
  const {corte = false, brasa = 1, nevoa = 0, calor = 0, folga = 0, bolinha = 0} = estado;
  const {tabaco = pronto, aluminio = pronto, carvao = pronto} = montagem;
  return (
    <group position={pos}>
      <Solido id="narguile">
        <Cortado ativo={corte}>
          {/* vaso de vidro, água e a fumaça do espaço vazio */}
          <Parte perfil={VASO} tipo="vidro" cor={CORES.claro} corte={corte} sombra={false} />
          <Volume perfil={AGUA} cor={CORES.cinza} opacidade={0.42} corte={corte} />
          <Volume perfil={AR} cor={CORES.claro} opacidade={nevoa * 0.5} corte={corte} />
          {/* tubo central, corpo e borracha */}
          <Parte perfil={TUBO} tipo="metal" cor={CORES.cinza} corte={corte} />
          <Parte perfil={CORPO} tipo="metal" cor={CORES.medio} corte={corte} />
          <mesh position={[0, GARGALO_Y + 0.003 + folga * 0.012, 0]} rotation={[Math.PI / 2, 0, folga * 0.25]} castShadow>
            <torusGeometry args={[0.0215, 0.0055, 12, 40]} />
            <Material tipo="borracha" cor={CORES.escuro} />
          </mesh>
          {/* prato e fornilho de cerâmica */}
          <Parte perfil={PRATO} tipo="metal" cor={CORES.cinza} corte={corte} />
          <Parte perfil={FORNILHO} tipo="ceramica" cor={CORES.medio} corte={corte} />
          {tabaco(<Tabaco corte={corte} calor={calor} />, 0)}
          {aluminio(<Aluminio />, 0)}
          {CARVOES.map((_, i) => (
            <React.Fragment key={i}>{carvao(<Carvao i={i} brasa={brasa} />, i)}</React.Fragment>
          ))}
          {/* porta da mangueira (+x) e válvula de alívio (−x) */}
          <mesh position={[0.03, PORTA_MANGUEIRA[1], 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.022, 20]} />
            <Material tipo="metal" cor={CORES.medio} />
          </mesh>
          <mesh position={[-0.032, VALVULA[1], 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.026, 16]} />
            <Material tipo="metal" cor={CORES.medio} />
          </mesh>
          <mesh position={[VALVULA[0], VALVULA[1] + 0.006, 0]} castShadow>
            <cylinderGeometry args={[0.0085, 0.0085, 0.018, 20, 1, true]} />
            <Material tipo="metal" cor={CORES.medio} />
          </mesh>
        </Cortado>
        <Mangueira />
        <mesh position={[VALVULA[0], BOLINHA_Y + bolinha * 0.014, 0]} castShadow>
          <sphereGeometry args={[0.0068, 20, 14]} />
          <Material tipo="cromado" cor={CORES.claro} />
        </mesh>
      </Solido>
      {brasa > 0 ? <pointLight position={[0, CARVAO_Y + 0.03, 0.01]} color={tema.acento} intensity={0.03 + brasa * 0.06} distance={0.12} decay={2} /> : null}
      {children}
    </group>
  );
};

// ---------- Vaso de comparação: o mesmo vaso com o tubo mergulhado fundo demais ----------
export const PONTA_FUNDA = 0.035;
const TUBO_FUNDO: Perfil = [[0.006, PONTA_FUNDA], [0.009, PONTA_FUNDA], [0.009, 0.3], [0.006, 0.3]];
const TOCO: Perfil = [[0.006, 0.267], [0.02, 0.267], [0.022, 0.3], [0.018, 0.32], [0.006, 0.32]];
export const VasoFundo: React.FC<{pos: V3; corte?: boolean}> = ({pos, corte = true}) => (
  <group position={pos}>
    <Solido id="vaso-fundo">
      <Cortado ativo={corte}>
        <Parte perfil={VASO} tipo="vidro" cor={CORES.claro} corte={corte} sombra={false} />
        <Volume perfil={AGUA} cor={CORES.cinza} opacidade={0.42} corte={corte} />
        <Parte perfil={TUBO_FUNDO} tipo="metal" cor={CORES.cinza} corte={corte} />
        <Parte perfil={TOCO} tipo="metal" cor={CORES.medio} corte={corte} />
        <mesh position={[0, GARGALO_Y + 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.0215, 0.0055, 12, 40]} />
          <Material tipo="borracha" cor={CORES.escuro} />
        </mesh>
      </Cortado>
    </Solido>
  </group>
);

// ---------- Mesa baixa de madeira ----------
export const MESA = {pos: [0, 0.225, 0] as V3, args: [1.0, 0.45, 0.62] as V3};
export const TOPO = MESA.pos[1] + MESA.args[1] / 2;
export const Mesa: React.FC = () => (
  <Solido id="mesa">
    <mesh position={[0, TOPO - 0.015, 0]} castShadow receiveShadow>
      <boxGeometry args={[MESA.args[0], 0.03, MESA.args[2]]} />
      <Material tipo="madeira" cor={tema.areia} escala={2} />
    </mesh>
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (MESA.args[0] / 2 - 0.06), (TOPO - 0.03) / 2, sz * (MESA.args[2] / 2 - 0.06)]} castShadow>
          <boxGeometry args={[0.045, TOPO - 0.03, 0.045]} />
          <Material tipo="madeira" cor={mistura(tema.areia, CORES.escuro, 0.3)} />
        </mesh>
      )),
    )}
  </Solido>
);

// ---------- Coco que se abre em duas metades (o 1º vaso) ----------
export const COCO_R = 0.055;
export const Coco: React.FC<{pos: V3; abre: number}> = ({pos, abre}) => {
  const casca = useMemo(() => new THREE.SphereGeometry(COCO_R, 32, 20, 0, Math.PI), []);
  const miolo = useMemo(() => new THREE.CircleGeometry(COCO_R * 0.97, 32), []);
  return (
    <Solido id="coco">
      <group position={pos}>
        {([1, -1] as const).map((l) => (
          // cada metade desliza para fora e deita com o miolo para cima (o centro fica sempre a um raio da mesa)
          <group key={l} position={[l * (0.001 + abre * 0.065), COCO_R, 0]} rotation={[0, 0, -l * abre * Math.PI * 0.5]}>
            <group rotation={[0, l * Math.PI * 0.5, 0]}>
              <mesh geometry={casca} castShadow>
                <Material tipo="tecido" cor={COR_COCO} />
              </mesh>
              <mesh geometry={miolo} rotation={[0, Math.PI, 0]} position={[0, 0, 0.0006]}>
                <Material tipo="fosco" cor={CORES.claro} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </Solido>
  );
};

// ---------- Mapa estilizado no chão (contorno aproximado do sul da Ásia) ----------
const INDIA: [number, number][] = [
  [68.5, 23.5], [70, 20.8], [72.8, 19], [73.5, 16], [74.6, 13], [76.5, 8.6], [77.5, 8.1], [78.3, 9.2], [80.2, 13], [80.3, 15.8], [82.3, 17], [85, 19.5], [87, 21.5], [89, 22], [91.5, 22.5], [92.5, 24.5], [96.5, 27.5],
  [95, 29], [91, 27.5], [88, 27.4], [84, 28.6], [80.5, 30.2], [78.5, 32.3], [76, 34.6], [74, 34.3], [73.6, 32.5], [71.5, 30], [70, 28], [69.5, 26],
];
export const MAPA = {pos: [0, 0, 1.25] as V3, larg: 1.0, prof: 0.9};
const ESC_MAPA = 0.022; // metros por grau
const CENTRO_MAPA: [number, number] = [82, 21];
export const noMapa = (lon: number, lat: number): V3 => [MAPA.pos[0] + (lon - CENTRO_MAPA[0]) * ESC_MAPA, 0.0285, MAPA.pos[2] - (lat - CENTRO_MAPA[1]) * ESC_MAPA];
export const AGRA = noMapa(77.7, 27.1); // corte de Akbar (Fatehpur Sikri, perto de Agra)
export const Mapa: React.FC = () => {
  const geo = useMemo(() => {
    const s = new THREE.Shape(INDIA.map(([lo, la]) => new THREE.Vector2((lo - CENTRO_MAPA[0]) * ESC_MAPA, (la - CENTRO_MAPA[1]) * ESC_MAPA)));
    return new THREE.ExtrudeGeometry(s, {depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2});
  }, []);
  return (
    <Solido id="mapa">
      <mesh position={[MAPA.pos[0], 0.006, MAPA.pos[2]]} receiveShadow>
        <boxGeometry args={[MAPA.larg, 0.012, MAPA.prof]} />
        <Material tipo="papel" cor={CORES.escuro} />
      </mesh>
      <mesh geometry={geo} position={[MAPA.pos[0], 0.0125, MAPA.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <Material tipo="papel" cor={CORES.medio} />
      </mesh>
    </Solido>
  );
};
// pino que marca a cidade
export const Pino: React.FC<{pos: V3}> = ({pos}) => (
  <group position={pos}>
    <mesh position={[0, 0.026, 0]} rotation={[Math.PI, 0, 0]} castShadow>
      <coneGeometry args={[0.014, 0.05, 20]} />
      <Material tipo="plastico" cor={tema.acento} />
    </mesh>
    <mesh position={[0, 0.066, 0]} castShadow>
      <sphereGeometry args={[0.022, 24, 16]} />
      <Material tipo="plastico" cor={tema.acento} />
    </mesh>
  </group>
);
// cúpula de palácio (genérica, sem prédio real)
const CUPULA: Perfil = [[0, 0], [0.04, 0], [0.04, 0.05], [0.05, 0.065], [0.046, 0.09], [0.026, 0.115], [0.006, 0.13], [0.0, 0.14]];
export const Palacio: React.FC<{pos: V3}> = ({pos}) => {
  const geo = useMemo(() => geoLathe(CUPULA, 40), []);
  return (
    <group position={pos}>
      <Caixa args={[0.16, 0.05, 0.11]} position={[0, 0.025, 0]} cor={CORES.cinza} raio={0.008} />
      <mesh geometry={geo} position={[0, 0.05, 0]} castShadow>
        <Material tipo="ceramica" cor={CORES.claro} />
      </mesh>
    </group>
  );
};

// ---------- A sala (recinto fechado: paredes + teto) ----------
export const SALA = {pos: [-1.9, 0, -0.4] as V3, args: [1.3, 0.75, 1.0] as V3};
export const Sala: React.FC = () => {
  const [L, A, P] = SALA.args;
  const e = 0.04;
  return (
    <Solido id="sala">
      <group position={SALA.pos}>
        <Caixa args={[L - 2 * e - 0.006, 0.02, P - e - 0.006]} position={[0, 0.011, e / 2]} cor={CORES.escuro} raio={0.008} />
        <Caixa args={[L, A, e]} position={[0, A / 2 + 0.002, -P / 2 + e / 2]} cor={CORES.medio} raio={0.012} />
        <Caixa args={[e, A - 0.003, P - e - 0.003]} position={[-L / 2 + e / 2, A / 2 + 0.002, e / 2]} cor={CORES.medio} raio={0.012} />
        <Caixa args={[e, A - 0.003, P - e - 0.003]} position={[L / 2 - e / 2, A / 2 + 0.002, e / 2]} cor={CORES.medio} raio={0.012} />
      </group>
    </Solido>
  );
};
export const TetoSala: React.FC = () => (
  <Solido id="teto">
    <Caixa args={[SALA.args[0] + 0.08, 0.04, SALA.args[2] + 0.08]} position={[SALA.pos[0], SALA.args[1] + 0.022, SALA.pos[2]]} cor={CORES.cinza} raio={0.012} />
  </Solido>
);
