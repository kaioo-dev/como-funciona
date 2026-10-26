// O apresentador (um jacaré-de-papo-amarelo cartunesco, original) e o estúdio do telejornal.
// Medidas em metros, chão em y = 0. O jacaré fica atrás da bancada, de frente para +z.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Caixa, Material, Solido, type V3} from '../../base/kit';
import {BAIRROS, CIDADE, RIO, type Ponto} from './mapa';

// paleta do apresentador e do estúdio (identidade própria do boletim, separada do estilo do perfil "POR DENTRO")
export const C = {
  pele: '#5E8C3A',
  peleEscura: '#3F6527',
  papo: '#F2C94C', // o papo amarelo
  olho: '#FFFFFF',
  pupila: '#14110A',
  dente: '#F6F2E6',
  boca: '#7A2E2E',
  palete: '#1E2B3C', // paletó azul-marinho
  paleteEscuro: '#141E2A',
  camisa: '#EEF1F5',
  gravata: '#FFC83D', // o acento (o mesmo amarelo do boletim)
  bancada: '#1A2531',
  bancadaTopo: '#2A3846',
  estudio: '#0E151D',
  painel: '#16212C',
  luz: '#FFC83D',
  agua: '#2C6E8F',
};

// ---------- O JACARÉ ----------
export type PoseJacare = {
  boca?: number; // 0 fechada .. 1 aberta (fala)
  piscar?: number; // 0 aberto .. 1 fechado
  cabeca?: V3; // rotação da cabeça (x: acena, y: vira, z: inclina)
  olhar?: [number, number]; // pupilas (-1..1, -1..1)
  bracoD?: number; // 0 mão na bancada .. 1 apontando para o telão
};

const esfera = new THREE.SphereGeometry(1, 32, 24);
const capsula = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 20);

const Olho: React.FC<{x: number; piscar: number; olhar: [number, number]}> = ({x, piscar, olhar}) => (
  <group position={[x, 0.15, 0.02]}>
    {/* calombo do olho (como os jacarés de verdade: olhos no alto da cabeça) */}
    <mesh geometry={esfera} scale={[0.085, 0.075, 0.08]} castShadow>
      <Material tipo="pele" cor={C.pele} />
    </mesh>
    <mesh geometry={esfera} scale={0.066} position={[0, 0.018, 0.03]}>
      <meshPhysicalMaterial color={C.olho} roughness={0.25} clearcoat={0.6} />
    </mesh>
    <mesh geometry={esfera} scale={0.032} position={[olhar[0] * 0.018, 0.02 + olhar[1] * 0.012, 0.085]}>
      <meshStandardMaterial color={C.pupila} roughness={0.3} />
    </mesh>
    <mesh geometry={esfera} scale={0.011} position={[olhar[0] * 0.018 + 0.012, 0.035 + olhar[1] * 0.012, 0.108]}>
      <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
    </mesh>
    {/* pálpebra: desce para piscar */}
    <mesh geometry={esfera} scale={[0.07, 0.07 * (0.15 + 0.85 * piscar), 0.072]} position={[0, 0.018 + 0.05 * (1 - piscar), 0.026]}>
      <Material tipo="pele" cor={C.peleEscura} />
    </mesh>
  </group>
);

const Dentes: React.FC<{lado: 1 | -1; y: number; z0: number; z1: number; n: number; baixo?: boolean}> = ({lado, y, z0, z1, n, baixo}) => (
  <>
    {Array.from({length: n}, (_, i) => {
      const z = z0 + ((z1 - z0) * i) / (n - 1);
      const x = lado * (0.1 - (i / (n - 1)) * 0.035);
      return (
        <mesh key={i} position={[x, y, z]} rotation={[baixo ? 0 : Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.012, 0.03, 10]} />
          <meshPhysicalMaterial color={C.dente} roughness={0.3} clearcoat={0.4} />
        </mesh>
      );
    })}
  </>
);

export const Jacare: React.FC<{pos: V3; rotY?: number; pose?: PoseJacare}> = ({pos, rotY = 0, pose = {}}) => {
  const {boca = 0, piscar = 0, cabeca = [0, 0, 0], olhar = [0, 0], bracoD = 0} = pose;
  const geoTronco = useMemo(() => capsula(0.24, 0.42), []);
  const geoBraco = useMemo(() => capsula(0.06, 0.32), []);
  const geoFocinho = useMemo(() => capsula(0.105, 0.4), []);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Solido id="jacare">
        {/* tronco com paletó, camisa e gravata */}
        <mesh geometry={geoTronco} position={[0, 1.18, 0]} scale={[1.12, 1, 0.82]} castShadow>
          <Material tipo="tecido" cor={C.palete} />
        </mesh>
        {/* ombros do paletó */}
        {[-1, 1].map((l) => (
          <mesh key={l} geometry={esfera} position={[l * 0.24, 1.43, 0]} scale={[0.11, 0.09, 0.11]} castShadow>
            <Material tipo="tecido" cor={C.palete} />
          </mesh>
        ))}
        {/* camisa em V, gravata e lapelas (na frente do paletó, que vai até z ≈ 0,197) */}
        <mesh position={[0, 1.37, 0.199]} rotation={[-0.12, 0, Math.PI]}>
          <circleGeometry args={[0.13, 3]} />
          <Material tipo="tecido" cor={C.camisa} />
        </mesh>
        <mesh position={[0, 1.4, 0.207]} rotation={[-0.12, 0, Math.PI / 4]}>
          <boxGeometry args={[0.045, 0.045, 0.02]} />
          <Material tipo="tecido" cor={C.gravata} />
        </mesh>
        <mesh position={[0, 1.27, 0.212]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.06, 0.22, 0.014]} />
          <Material tipo="tecido" cor={C.gravata} />
        </mesh>
        {[-1, 1].map((l) => (
          <mesh key={l} position={[l * 0.075, 1.33, 0.206]} rotation={[-0.12, 0, l * 0.42]}>
            <boxGeometry args={[0.055, 0.28, 0.016]} />
            <Material tipo="tecido" cor={C.paleteEscuro} />
          </mesh>
        ))}
        {/* pescoço com o papo amarelo */}
        <mesh geometry={esfera} position={[0, 1.5, 0.04]} scale={[0.17, 0.12, 0.15]} castShadow>
          <Material tipo="pele" cor={C.pele} />
        </mesh>
        <mesh geometry={esfera} position={[0, 1.48, 0.13]} scale={[0.12, 0.08, 0.06]}>
          <Material tipo="pele" cor={C.papo} />
        </mesh>
        {/* braços: o esquerdo apoiado na bancada; o direito aponta para o telão (bracoD) */}
        <group position={[-0.28, 1.42, 0.02]} rotation={[-0.95, 0, 0.22]}>
          <mesh geometry={geoBraco} position={[0, -0.2, 0]} castShadow>
            <Material tipo="tecido" cor={C.palete} />
          </mesh>
          <mesh geometry={esfera} position={[0, -0.42, 0]} scale={[0.07, 0.055, 0.08]} castShadow>
            <Material tipo="pele" cor={C.pele} />
          </mesh>
        </group>
        <group position={[0.28, 1.42, 0.02]} rotation={[-0.95 + bracoD * 0.2, -bracoD * 0.6, -0.22 - bracoD * 1.25]}>
          <mesh geometry={geoBraco} position={[0, -0.2, 0]} castShadow>
            <Material tipo="tecido" cor={C.palete} />
          </mesh>
          <mesh geometry={esfera} position={[0, -0.42, 0]} scale={[0.07, 0.055, 0.08]} castShadow>
            <Material tipo="pele" cor={C.pele} />
          </mesh>
        </group>
        {/* cabeça: crânio achatado + focinho longo (é isso que diz "jacaré", não "sapo") */}
        <group position={[0, 1.7, 0.0]} rotation={cabeca}>
          <mesh geometry={esfera} scale={[0.19, 0.13, 0.21]} castShadow>
            <Material tipo="pele" cor={C.pele} />
          </mesh>
          {/* bochechas */}
          {[-1, 1].map((l) => (
            <mesh key={l} geometry={esfera} position={[l * 0.13, -0.03, 0.06]} scale={[0.08, 0.075, 0.1]} castShadow>
              <Material tipo="pele" cor={C.pele} />
            </mesh>
          ))}
          {/* escamas (osteodermos) em fileira atrás dos olhos */}
          {[-0.05, 0.05].map((x) =>
            [-0.13, -0.06, 0.01].map((z, i) => (
              <mesh key={`${x}${z}`} geometry={esfera} position={[x, 0.12 - i * 0.004, z - 0.02]} scale={[0.028, 0.022, 0.03]} castShadow>
                <Material tipo="pele" cor={C.peleEscura} />
              </mesh>
            )),
          )}
          {/* maxilar de cima: longo, largo e achatado */}
          <group position={[0, 0.0, 0.1]}>
            <mesh geometry={geoFocinho} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.0, 0.27]} scale={[1.05, 1, 0.55]} castShadow>
              <Material tipo="pele" cor={C.pele} />
            </mesh>
            {/* sulco escuro do lábio e calombo das narinas na ponta */}
            <mesh geometry={esfera} position={[0, 0.045, 0.56]} scale={[0.07, 0.035, 0.05]} castShadow>
              <Material tipo="pele" cor={C.pele} />
            </mesh>
            {[-1, 1].map((l) => (
              <mesh key={l} geometry={esfera} position={[l * 0.028, 0.07, 0.575]} scale={0.014}>
                <meshStandardMaterial color={C.pupila} roughness={0.6} />
              </mesh>
            ))}
            {[-1, 1].map((l) => (
              <Dentes key={l} lado={l as 1 | -1} y={-0.05} z0={0.05} z1={0.55} n={8} />
            ))}
          </group>
          {/* maxilar de baixo (verde por fora; o papo amarelo fica embaixo): gira na dobradiça para falar */}
          <group position={[0, -0.05, 0.08]} rotation={[boca * 0.38, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.025, 0.27]} scale={[0.95, 0.9, 0.38]} geometry={geoFocinho} castShadow>
              <Material tipo="pele" cor={C.pele} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.05, 0.22]} scale={[0.75, 0.75, 0.25]} geometry={geoFocinho}>
              <Material tipo="pele" cor={C.papo} />
            </mesh>
            <mesh position={[0, 0.005, 0.27]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.15, 0.52]} />
              <meshStandardMaterial color={C.boca} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {[-1, 1].map((l) => (
              <Dentes key={l} lado={l as 1 | -1} y={0.022} z0={0.08} z1={0.52} n={7} baixo />
            ))}
          </group>
          <Olho x={-0.085} piscar={piscar} olhar={olhar} />
          <Olho x={0.085} piscar={piscar} olhar={olhar} />
        </group>
        {/* cauda aparecendo ao lado da bancada */}
        <mesh geometry={useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 0.75, -0.15), new THREE.Vector3(0.55, 0.35, -0.3), new THREE.Vector3(1.0, 0.15, -0.1), new THREE.Vector3(1.25, 0.18, 0.25)]), 40, 0.09, 14, false), [])} castShadow>
          <Material tipo="pele" cor={C.pele} />
        </mesh>
        {[0.3, 0.55, 0.8, 1.02].map((s, i) => (
          <mesh key={i} geometry={esfera} position={[0.12 + s * 0.95, 0.72 - s * 0.6 + (s > 0.7 ? 0.1 : 0) + 0.08, -0.15 - s * 0.12 + (s > 0.7 ? (s - 0.7) * 0.9 : 0)]} scale={0.035}>
            <Material tipo="pele" cor={C.peleEscura} />
          </mesh>
        ))}
      </Solido>
    </group>
  );
};

// ---------- Telão com o mapa de Joinville (textura desenhada em canvas) ----------
const texturaTelao = (titulo: string, sub: string) => {
  const W = 1600;
  const H = 900;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#16212C');
  grad.addColorStop(1, '#0B1118');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // mapa: bairros da área urbana
  const box = {lon: [-48.96, -48.74], lat: [-26.4, -26.15]};
  const kx = Math.cos((-26.3 * Math.PI) / 180);
  const s = Math.min((W * 0.62) / ((box.lon[1] - box.lon[0]) * kx), (H * 0.86) / (box.lat[1] - box.lat[0]));
  const ox = W * 0.66;
  const oy = H * 0.52;
  const cx = (box.lon[0] + box.lon[1]) / 2;
  const cy = (box.lat[0] + box.lat[1]) / 2;
  const pj = (p: Ponto): [number, number] => [ox + (p[0] - cx) * kx * s, oy - (p[1] - cy) * s];
  const anel = (a: Ponto[]) => {
    g.beginPath();
    a.forEach((p, i) => (i ? g.lineTo(...pj(p)) : g.moveTo(...pj(p))));
    g.closePath();
  };
  g.fillStyle = '#1C2835';
  CIDADE.forEach((a) => {
    anel(a);
    g.fill();
  });
  BAIRROS.forEach((b) => {
    b.aneis.forEach((a) => {
      anel(a);
      g.fillStyle = b.nome === 'Centro' ? 'rgba(255,200,61,0.55)' : '#28394B';
      g.fill();
      g.strokeStyle = b.nome === 'Centro' ? '#FFC83D' : '#4A647D';
      g.lineWidth = b.nome === 'Centro' ? 4 : 2;
      g.stroke();
    });
  });
  g.strokeStyle = C.agua;
  g.lineWidth = 7;
  g.lineCap = 'round';
  RIO.forEach((l) => {
    g.beginPath();
    l.forEach((p, i) => (i ? g.lineTo(...pj(p)) : g.moveTo(...pj(p))));
    g.stroke();
  });
  // textos do telão (lado esquerdo)
  g.fillStyle = '#FFC83D';
  g.fillRect(70, 110, 14, 14);
  g.font = '700 34px Menlo, monospace';
  g.fillStyle = '#8E9BAA';
  g.fillText(sub, 100, 126);
  g.font = '900 96px "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = '#F2F5F8';
  titulo.split('\n').forEach((l, i) => g.fillText(l, 66, 250 + i * 104));
  g.font = '800 62px "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = '#FFC83D';
  g.fillText('15° → 23°', 70, 560);
  g.font = '600 40px "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = '#C9D2DC';
  g.fillText('sol entre nuvens', 72, 620);
  g.fillText('maré alta 13h43', 72, 676);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

export const TELAO = {pos: [0, 1.75, -1.3] as V3, larg: 2.6, alt: 1.46};
export const Telao: React.FC<{titulo?: string; sub?: string; brilho?: number}> = ({titulo = 'Bom dia,\nJoinville', sub = 'SEGUNDA · 26/10', brilho = 0.55}) => {
  const tex = useMemo(() => texturaTelao(titulo, sub), [titulo, sub]);
  return (
    <Solido id="telao">
      <group position={TELAO.pos}>
        <Caixa args={[TELAO.larg + 0.12, TELAO.alt + 0.12, 0.08]} position={[0, 0, -0.05]} cor={C.paleteEscuro} raio={0.04} />
        <mesh position={[0, 0, 0.0]}>
          <planeGeometry args={[TELAO.larg, TELAO.alt]} />
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#FFFFFF" emissiveIntensity={brilho} roughness={0.6} />
        </mesh>
      </group>
    </Solido>
  );
};

// ---------- Bancada curva do apresentador ----------
export const BANCADA = {y: 1.0, z: 0.35};
const placaLogo = () => {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = C.bancada;
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = C.gravata;
  g.beginPath();
  g.arc(150, 128, 22, 0, Math.PI * 2);
  g.fill();
  g.font = '800 82px Menlo, monospace';
  g.fillStyle = '#F2F5F8';
  g.fillText('JOINVILLE HOJE', 200, 156);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};
export const Bancada: React.FC = () => {
  const tex = useMemo(placaLogo, []);
  // frente curva: um pedaço de cilindro (arco de ~70°)
  const R = 2.2;
  const arco = 1.15;
  return (
    <Solido id="bancada">
      <group position={[0, 0, BANCADA.z - R]}>
        <mesh position={[0, BANCADA.y / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, BANCADA.y, 64, 1, true, -arco / 2, arco]} />
          <Material tipo="fosco" cor={C.bancada} />
        </mesh>
        <mesh position={[0, BANCADA.y + 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[R + 0.08, R + 0.08, 0.04, 64, 1, false, -arco / 2 - 0.02, arco + 0.04]} />
          <Material tipo="fosco" cor={C.bancadaTopo} />
        </mesh>
        {/* faixa de luz amarela e o logo na frente */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[R + 0.004, R + 0.004, 0.025, 64, 1, true, -arco / 2, arco]} />
          <meshBasicMaterial color={C.luz} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[R + 0.006, R + 0.006, 0.3, 64, 1, true, -0.42, 0.84]} />
          <meshStandardMaterial map={tex} transparent side={THREE.FrontSide} roughness={0.6} emissiveMap={tex} emissive="#FFFFFF" emissiveIntensity={0.25} />
        </mesh>
      </group>
    </Solido>
  );
};

// ---------- O estúdio (parede de painéis, piso, faixas de luz) ----------
export const Estudio: React.FC = () => (
  <Solido id="estudio">
    <mesh position={[0, 0.001, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[4.5, 64]} />
      <Material tipo="plastico" cor="#121B24" />
    </mesh>
    {/* parede curva atrás, em painéis */}
    {Array.from({length: 9}, (_, i) => {
      const a = -1.0 + (i / 8) * 2.0;
      const R = 3.2;
      return (
        <group key={i} position={[Math.sin(a) * R, 1.6, -0.6 - Math.cos(a) * R + 1.4]} rotation={[0, -a, 0]}>
          <Caixa args={[0.72, 3.2, 0.06]} cor={i % 2 ? C.painel : '#132029'} raio={0.02} />
          <mesh position={[0, -1.25, 0.04]}>
            <boxGeometry args={[0.6, 0.02, 0.01]} />
            <meshBasicMaterial color={C.luz} toneMapped={false} />
          </mesh>
        </group>
      );
    })}
  </Solido>
);
