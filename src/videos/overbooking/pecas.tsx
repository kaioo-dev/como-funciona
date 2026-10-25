import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Caixa, Fosco, Placa, type V3} from '../../base/pecas';
import {Material} from '../../base/materiais';
import type {Tema} from '../../base/tema';

// Peças 3D do vídeo do overbooking: o avião (com corte que mostra os 180 assentos),
// passageiros em multidão (instanciados), passagens caindo, escada e o balcão do portão.

// ---------- Medidas do avião (eixo do avião em x, bico para +x, porta do lado +z) ----------
export const FY = 3.0; // centro da fuselagem
export const RAIO = 2.0;
export const PISO = FY - 0.7; // topo do piso da cabine
export const FILEIRAS = 30;
export const COLUNAS_Z = [-1.4, -0.92, -0.44, 0.44, 0.92, 1.4];
export const N_ASSENTOS = FILEIRAS * COLUNAS_Z.length; // 180
export const X_FILEIRA = (r: number) => -11.6 + r * 0.8;
export const posAssento = (i: number): V3 => [X_FILEIRA(Math.floor(i / 6)), PISO, COLUNAS_Z[i % 6]];
export const PORTA: V3 = [11.2, PISO, RAIO];

const geoAssento = new THREE.BoxGeometry(0.42, 0.14, 0.42);
const geoEncosto = new THREE.BoxGeometry(0.1, 0.62, 0.42);
const geoCorpo = new THREE.CapsuleGeometry(1, 1, 6, 14);
const geoCabeca = new THREE.SphereGeometry(1, 16, 12);
const geoCartao = new THREE.BoxGeometry(0.46, 0.025, 0.22);
const geoJanela = new THREE.BoxGeometry(0.22, 0.3, 0.06);
const tmp = new THREE.Object3D();
const cor = new THREE.Color();

// Material com corte opcional (plano horizontal: some tudo acima de `corteY`).
const useCorte = (corteY: number | null) => {
  const gl = useThree((st) => st.gl);
  gl.localClippingEnabled = true;
  return useMemo(() => (corteY === null ? undefined : [new THREE.Plane(new THREE.Vector3(0, -1, 0), corteY)]), [corteY]);
};

// Assentos e passageiros instanciados. `ocupado(i)` 0..1 (escala do passageiro), `corAssento(i)`.
const Cabine: React.FC<{ocupado: (i: number) => number; corAssento: (i: number) => string; corPassageiro?: string}> = ({ocupado, corAssento, corPassageiro = '#A9B3C1'}) => {
  const preparar = (parte: 'assento' | 'encosto' | 'corpo' | 'cabeca') => (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    for (let i = 0; i < N_ASSENTOS; i++) {
      const [x, y, z] = posAssento(i);
      const s = parte === 'corpo' || parte === 'cabeca' ? ocupado(i) : 1;
      if (parte === 'assento') tmp.position.set(x, y + 0.36, z);
      else if (parte === 'encosto') tmp.position.set(x - 0.22, y + 0.66, z);
      else if (parte === 'corpo') tmp.position.set(x - 0.04, y + 0.66 + (1 - s) * 0.3, z);
      else tmp.position.set(x - 0.02, y + 1.08 + (1 - s) * 0.3, z);
      if (parte === 'corpo') tmp.scale.set(0.16 * s, 0.17 * s, 0.13 * s);
      else if (parte === 'cabeca') tmp.scale.setScalar(0.1 * s);
      else tmp.scale.setScalar(1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, cor.set(parte === 'assento' || parte === 'encosto' ? corAssento(i) : corPassageiro));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh ref={preparar('assento')} args={[geoAssento, undefined, N_ASSENTOS]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={preparar('encosto')} args={[geoEncosto, undefined, N_ASSENTOS]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={preparar('corpo')} args={[geoCorpo, undefined, N_ASSENTOS]} castShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={preparar('cabeca')} args={[geoCabeca, undefined, N_ASSENTOS]} castShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </>
  );
};

// Janelas dos dois lados, alinhadas com as fileiras.
const Janelas: React.FC<{luz: number; corte: THREE.Plane[] | undefined}> = ({luz, corte}) => {
  const n = FILEIRAS * 2;
  const preparar = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    for (let i = 0; i < n; i++) {
      const lado = i < FILEIRAS ? 1 : -1;
      const r = i % FILEIRAS;
      const yy = 0.5;
      tmp.position.set(X_FILEIRA(r) + 0.1, FY + yy, lado * Math.sqrt(RAIO * RAIO - yy * yy));
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <instancedMesh ref={preparar} args={[geoJanela, undefined, n]}>
      <meshStandardMaterial color="#1A1F27" emissive="#FFD9A8" emissiveIntensity={luz * 1.6} toneMapped={luz === 0} clippingPlanes={corte} />
    </instancedMesh>
  );
};

export type AviaoProps = {
  tema: Tema;
  pos?: V3;
  rot?: V3;
  // Corte: altura (mundo) acima da qual a fuselagem some. null = avião fechado.
  corteY?: number | null;
  ocupado?: (i: number) => number;
  corAssento?: (i: number) => string;
  janelas?: number;
  porta?: number; // 0 fechada, 1 aberta (luz saindo)
  trem?: number; // 1 trem de pouso baixado
};
export const Aviao: React.FC<AviaoProps> = ({tema, pos = [0, 0, 0], rot = [0, 0, 0], corteY = null, ocupado = () => 0, corAssento = () => tema.objetoEscuro, janelas = 1, porta = 0, trem = 1}) => {
  const corte = useCorte(corteY);
  const lado = corte ? THREE.DoubleSide : THREE.FrontSide;
  const casco = <meshStandardMaterial color={tema.objeto} roughness={0.42} metalness={0.15} clippingPlanes={corte} clipShadows side={lado} />;
  const L = 27;
  return (
    <group position={pos} rotation={rot}>
      {/* Fuselagem, bico e cone de cauda */}
      <mesh position={[0, FY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[RAIO, RAIO, L, 48, 1, true]} />
        {casco}
      </mesh>
      <mesh position={[L / 2, FY, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1.9, 1]} castShadow>
        <sphereGeometry args={[RAIO, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {casco}
      </mesh>
      {/* Para-brisa */}
      <mesh position={[L / 2 + 2.35, FY + 0.95, 0]} rotation={[0, 0, -0.75]} scale={[0.55, 0.1, 1.45]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#10141A" roughness={0.2} metalness={0.4} clippingPlanes={corte} />
      </mesh>
      <mesh position={[-L / 2 - 3.2, FY + 0.35, 0]} rotation={[0, 0, Math.PI / 2 - 0.06]} castShadow>
        <cylinderGeometry args={[0.45, RAIO, 6.5, 48, 1, true]} />
        {casco}
      </mesh>
      {/* Deriva (laranja do canal) e estabilizadores */}
      <mesh position={[-L / 2 - 4.4, FY + RAIO + 1.7, 0]} rotation={[0, 0, 0.42]} castShadow>
        <boxGeometry args={[3.4, 4.2, 0.26]} />
        <meshStandardMaterial color={tema.acento} roughness={0.5} clippingPlanes={corte} side={lado} />
      </mesh>
      <mesh position={[-L / 2 - 4.6, FY + 0.5, 0]} castShadow>
        <boxGeometry args={[2.4, 0.16, 9.5]} />
        {casco}
      </mesh>
      {/* Asas enflechadas e motores */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[-0.6, FY - 1.15, s * (RAIO + 5.4)]} rotation={[0, -s * 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.6, 0.26, 11]} />
            <meshStandardMaterial color={tema.objeto} roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[1.4, FY - 1.95, s * 5.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.78, 0.7, 3.0, 32]} />
            <meshStandardMaterial color="#AEB6C1" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[2.92, FY - 1.95, s * 5.0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.66, 32]} />
            <meshStandardMaterial color="#0B0E12" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Faixa laranja ao longo da fuselagem, abaixo das janelas */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0.5, FY - 0.15, s * (Math.sqrt(RAIO * RAIO - 0.15 * 0.15) + 0.01)]}>
          <boxGeometry args={[L - 1, 0.16, 0.02]} />
          <meshStandardMaterial color={tema.acento} roughness={0.5} clippingPlanes={corte} />
        </mesh>
      ))}
      {/* Trem de pouso */}
      {trem > 0
        ? (
            [
              [11, 0],
              [-1.2, 1.4],
              [-1.2, -1.4],
            ] as [number, number][]
          ).map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, (FY - RAIO) / 2 + 0.3, 0]}>
                <cylinderGeometry args={[0.08, 0.08, FY - RAIO, 10]} />
                <meshStandardMaterial color="#7D8794" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.36, 0.36, 0.34, 20]} />
                <meshStandardMaterial color="#14181E" roughness={0.8} />
              </mesh>
            </group>
          ))
        : null}
      {/* Porta dianteira (lado +z): acende quando aberta */}
      <mesh position={[PORTA[0], PISO + 0.95, Math.sqrt(RAIO * RAIO - 0.25 * 0.25) + 0.03]}>
        <boxGeometry args={[0.95, 1.85, 0.06]} />
        <meshStandardMaterial color={porta > 0.02 ? '#2A2116' : '#B9C1CB'} emissive="#FFD9A8" emissiveIntensity={porta * 2.2} toneMapped={porta === 0} clippingPlanes={corte} />
      </mesh>
      <Janelas luz={janelas} corte={corte} />
      {/* Interior (só aparece com o corte) */}
      {corte ? (
        <>
          <mesh position={[0, PISO - 0.06, 0]} receiveShadow>
            <boxGeometry args={[L + 2, 0.12, RAIO * 1.86]} />
            <meshStandardMaterial color="#1B212B" roughness={0.9} />
          </mesh>
          <mesh position={[0, PISO + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[L - 2, 0.5]} />
            <meshStandardMaterial color="#2A3340" roughness={0.9} />
          </mesh>
          <Cabine ocupado={ocupado} corAssento={corAssento} />
        </>
      ) : null}
    </group>
  );
};

// ---------- Multidão (bonequinhos instanciados) ----------
export type Pessoa = {pos: V3; cor: string; s: number};
export const Multidao: React.FC<{pessoas: Pessoa[]}> = ({pessoas}) => {
  const n = pessoas.length;
  const preparar = (parte: 'corpo' | 'cabeca') => (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    pessoas.forEach((p, i) => {
      const s = Math.max(0.0001, p.s);
      if (parte === 'corpo') {
        tmp.position.set(p.pos[0], p.pos[1] + 0.68 * s, p.pos[2]);
        tmp.scale.set(0.21 * s, 0.33 * s, 0.17 * s);
      } else {
        tmp.position.set(p.pos[0], p.pos[1] + 1.42 * s, p.pos[2]);
        tmp.scale.setScalar(0.16 * s);
      }
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, cor.set(p.cor));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  if (n === 0) return null;
  return (
    <>
      <instancedMesh key={`c${n}`} ref={preparar('corpo')} args={[geoCorpo, undefined, n]} castShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh key={`h${n}`} ref={preparar('cabeca')} args={[geoCabeca, undefined, n]} castShadow>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </>
  );
};

// ---------- Passagens (cartões de embarque) ----------
export type Cartao3D = {pos: V3; rot: V3; cor: string; s?: number};
export const Passagens: React.FC<{cartoes: Cartao3D[]; brilho?: number}> = ({cartoes, brilho = 0}) => {
  const n = cartoes.length;
  const preparar = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    cartoes.forEach((c, i) => {
      tmp.position.set(...c.pos);
      tmp.rotation.set(...c.rot);
      tmp.scale.setScalar(c.s ?? 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, cor.set(c.cor));
    });
    tmp.rotation.set(0, 0, 0);
    tmp.scale.setScalar(1);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  if (n === 0) return null;
  return (
    <instancedMesh key={n} ref={preparar} args={[geoCartao, undefined, n]} castShadow>
      <meshStandardMaterial roughness={0.5} emissive="#FFFFFF" emissiveIntensity={brilho} />
    </instancedMesh>
  );
};

// ---------- Escada de embarque (caminhão-escada encostado na porta) ----------
const COMP_ESCADA = 3.6;
export const Escada: React.FC<{tema: Tema; pos?: V3}> = ({tema, pos = [PORTA[0], 0, RAIO + 0.15]}) => {
  const degraus = 11;
  const comp = COMP_ESCADA;
  return (
    <group position={pos}>
      <Caixa args={[1.9, 0.7, comp + 0.8]} raio={0.1} cor={tema.objetoEscuro} position={[0, 0.55, comp / 2 + 0.2]} />
      {Array.from({length: degraus}).map((_, i) => {
        const k = (i + 1) / degraus;
        return <Caixa key={i} args={[1.1, 0.12, comp / degraus + 0.02]} raio={0.02} cor={tema.objeto} position={[0, 0.9 + k * (PISO - 0.9), comp - k * comp + 0.15]} />;
      })}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, (0.9 + PISO) / 2 + 0.7, comp / 2 + 0.15]} rotation={[Math.atan2(PISO - 0.9, comp), 0, 0]}>
          <boxGeometry args={[0.06, 0.06, Math.hypot(comp, PISO - 0.9) + 0.2]} />
          <meshStandardMaterial color={tema.acento} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};
export const PE_ESCADA: V3 = [PORTA[0], 0, RAIO + 0.15 + COMP_ESCADA + 0.6];

// ---------- Balcão do portão ----------
export const Balcao: React.FC<{tema: Tema; pos: V3; rotY?: number}> = ({tema, pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Caixa args={[2.6, 1.1, 0.7]} raio={0.08} cor={tema.branco} position={[0, 0.55, 0]} />
    <Caixa args={[2.7, 0.06, 0.8]} raio={0.03} cor={tema.objeto} position={[0, 1.13, 0]} />
    <Caixa args={[0.08, 2.2, 0.08]} raio={0.03} cor={tema.objetoEscuro} position={[1.5, 1.1, -0.2]} />
    <Placa tema={tema} pos={[1.5, 2.55, -0.2]} larg={1.5} alt={0.7} linhas={[{t: 'PORTÃO 12', tam: 150, cor: '#121212'}, {t: 'EMBARQUE', tam: 70, cor: '#121212', peso: 600}]} fundo={tema.acento} />
  </group>
);

// ---------- Pátio: faixas amarelas e luzes de pista ----------
export const Patio: React.FC<{luzes?: boolean}> = ({luzes = true}) => (
  <>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[140, 0.16]} />
      <meshStandardMaterial color="#9C8233" roughness={0.9} />
    </mesh>
    <mesh position={[PORTA[0] + 2.6, 0.012, 9]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.16, 14]} />
      <meshStandardMaterial color="#9C8233" roughness={0.9} />
    </mesh>
    {luzes
      ? Array.from({length: 26}).flatMap((_, i) =>
          [-6.5, 6.5].map((z) => (
            <mesh key={`${i}${z}`} position={[-70 + i * 6, 0.08, z]}>
              <sphereGeometry args={[0.09, 10, 8]} />
              <meshBasicMaterial color={z > 0 ? '#8FB3FF' : '#FFC37A'} toneMapped={false} />
            </mesh>
          )),
        )
      : null}
  </>
);

// ---------- (v1.2) Objetos das cenas de direitos: relógio, bandeja, cama, chave, carro, cartão de milhas, recibo ----------
// Origem de cada um no chão/apoio (y = 0 = onde ele encosta), para cair e assentar com <Entra modo="cai">.
const geoDisco = new THREE.CylinderGeometry(1, 1, 1, 64);
export const Relogio: React.FC<{tema: Tema; pos: V3; minutos: number; r?: number}> = ({tema, pos, minutos, r = 0.9}) => {
  const aMin = -(minutos / 60) * Math.PI * 2;
  const aHora = -(minutos / 720) * Math.PI * 2 - Math.PI / 6;
  return (
    <group position={pos}>
      {/* em pé, de frente para +z, apoiado no chão por uma base */}
      <Caixa args={[r * 0.9, 0.12, 0.5]} raio={0.05} cor={tema.objetoEscuro} position={[0, 0.06, 0]} />
      <group position={[0, r + 0.12, 0]}>
        <mesh geometry={geoDisco} rotation={[Math.PI / 2, 0, 0]} scale={[r, 0.16, r]} castShadow receiveShadow>
          <Fosco cor={tema.objetoEscuro} />
        </mesh>
        <mesh geometry={geoDisco} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.081]} scale={[r * 0.88, 0.01, r * 0.88]}>
          <Fosco cor={tema.objeto} />
        </mesh>
        {Array.from({length: 12}, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <Caixa key={i} args={[0.05, i % 3 === 0 ? 0.16 : 0.08, 0.02]} raio={0.01} cor={tema.objetoEscuro} position={[Math.sin(a) * r * 0.72, Math.cos(a) * r * 0.72, 0.1]} rotation={[0, 0, -a]} />;
        })}
        <group rotation={[0, 0, aHora]} position={[0, 0, 0.12]}>
          <Caixa args={[0.07, r * 0.45, 0.025]} raio={0.02} cor={tema.objetoEscuro} position={[0, r * 0.2, 0]} />
        </group>
        <group rotation={[0, 0, aMin]} position={[0, 0, 0.14]}>
          <Caixa args={[0.045, r * 0.68, 0.025]} raio={0.015} cor={tema.acento} position={[0, r * 0.3, 0]} emissivo={0.2} />
        </group>
        <mesh geometry={geoDisco} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.16]} scale={[0.06, 0.03, 0.06]}>
          <Fosco cor={tema.objetoEscuro} />
        </mesh>
      </group>
    </group>
  );
};
export const Bandeja: React.FC<{tema: Tema; pos: V3}> = ({tema, pos}) => (
  <group position={pos}>
    <Caixa args={[0.9, 0.05, 0.6]} raio={0.025} cor={tema.objetoEscuro} position={[0, 0.025, 0]} />
    <mesh geometry={geoDisco} position={[-0.15, 0.065, 0]} scale={[0.22, 0.03, 0.22]} castShadow>
      <Material tipo="ceramica" cor={tema.objetoClaro} />
    </mesh>
    <mesh position={[-0.2, 0.11, 0.02]} scale={[0.1, 0.06, 0.08]} castShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <Fosco cor={tema.areia} />
    </mesh>
    <mesh position={[-0.08, 0.1, -0.05]} scale={[0.07, 0.045, 0.06]} castShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <Fosco cor={tema.areia} />
    </mesh>
    <Caixa args={[0.16, 0.2, 0.16]} raio={0.04} cor={tema.objeto} position={[0.28, 0.15, -0.08]} />
  </group>
);
export const Cama: React.FC<{tema: Tema; pos: V3; rotY?: number}> = ({tema, pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Caixa args={[1.6, 0.35, 2.1]} raio={0.06} cor={tema.objetoEscuro} position={[0, 0.175, 0]} />
    <Caixa args={[1.5, 0.22, 2.0]} raio={0.1} cor={tema.objeto} position={[0, 0.46, 0]} />
    <Caixa args={[1.52, 0.08, 1.2]} raio={0.04} cor={tema.corpo} position={[0, 0.6, 0.35]} />
    <Caixa args={[0.6, 0.14, 0.38]} raio={0.07} cor={tema.objetoClaro} position={[-0.36, 0.64, -0.72]} />
    <Caixa args={[0.6, 0.14, 0.38]} raio={0.07} cor={tema.objetoClaro} position={[0.36, 0.64, -0.72]} />
    <Caixa args={[1.66, 0.9, 0.12]} raio={0.05} cor={tema.objetoEscuro} position={[0, 0.45, -1.1]} />
  </group>
);
export const Chave: React.FC<{tema: Tema; pos: V3; rotY?: number}> = ({tema, pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Caixa args={[0.26, 0.03, 0.16]} raio={0.012} cor={tema.acento} position={[-0.12, 0.015, 0]} emissivo={0.15} />
    <Caixa args={[0.22, 0.018, 0.035]} raio={0.008} cor={tema.objeto} position={[0.1, 0.011, 0]} />
    <Caixa args={[0.03, 0.02, 0.05]} raio={0.006} cor={tema.objeto} position={[0.17, 0.01, 0.035]} />
  </group>
);
export const CartaoMilhas: React.FC<{tema: Tema; pos: V3; rotY?: number}> = ({tema, pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Caixa args={[0.43, 0.012, 0.27]} raio={0.005} cor={tema.objetoEscuro} position={[0, 0.006, 0]} />
    <Caixa args={[0.08, 0.004, 0.06]} raio={0.002} cor={tema.areia} position={[-0.12, 0.014, 0.02]} />
    <Caixa args={[0.3, 0.004, 0.025]} raio={0.002} cor={tema.acento} position={[0.02, 0.014, -0.08]} />
  </group>
);
export const Carro: React.FC<{tema: Tema; pos: V3; rotY?: number}> = ({tema, pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Caixa args={[1.9, 0.45, 0.9]} raio={0.15} cor={tema.objeto} position={[0, 0.42, 0]} />
    <Caixa args={[1.0, 0.36, 0.82]} raio={0.14} cor={tema.objeto} position={[-0.1, 0.8, 0]} />
    <Caixa args={[0.9, 0.24, 0.84]} raio={0.1} cor="#1A1F27" position={[-0.1, 0.82, 0]} />
    {[-0.6, 0.6].flatMap((x) =>
      [-0.42, 0.42].map((z) => (
        <mesh key={`${x}${z}`} geometry={geoDisco} position={[x, 0.2, z]} rotation={[Math.PI / 2, 0, 0]} scale={[0.2, 0.14, 0.2]} castShadow>
          <Material tipo="borracha" cor="#15191F" />
        </mesh>
      )),
    )}
  </group>
);
