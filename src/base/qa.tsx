// Checagem automática (v1.2).
// Só liga quando a composição roda com a opção {qa: true} (o `scripts/qa.mjs` liga sozinho); no vídeo normal não custa nada.
// A cada quadro, o <QaCena> (já incluído no CanvasCinema) descreve a cena inteira para o script:
//   - cada peça (mesh) com a sua caixa orientada, dona (boneco / sólido / grupo), tipo (partícula, overlay…) e
//     onde ela aparece na tela;
//   - a câmera e os alvos que ela precisa enquadrar; se o assunto está tapado por outro objeto;
//   - cada boneco: onde está a cabeça na tela e o tamanho dele no quadro.
// O script cruza tudo e aponta ATRAVESSANDO, ENTRADA SEM TRANSIÇÃO, FORA DO QUADRO, CÂMERA DENTRO DE OBJETO,
// ASSUNTO TAPADO, Z-FIGHTING, PARTÍCULA GRANDE, além do pé deslizando/flutuando dos bonecos.
import React, {useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {getInputProps, useCurrentFrame} from 'remotion';
import type {Cam} from './pecas';

export const QA_LIGADO = (() => {
  try {
    return Boolean((getInputProps() as {qa?: boolean}).qa);
  } catch {
    return false;
  }
})();

// Na checagem, o scripts/qa.mjs renderiza uma sequência CONTÍNUA de quadros (0, 1, 2…) e manda junto a lista dos quadros
// reais que quer ver (pares seguidos e rajadas espalhados pelo vídeo). O Remotion não sabe pular para quadros soltos
// (o everyNthFrame só pega múltiplos exatos), então o vídeo traduz: quadro renderizado k → quadro real qaQuadros[k].
const QA_QUADROS: number[] | null = (() => {
  try {
    const l = (getInputProps() as {qaQuadros?: number[]}).qaQuadros;
    return Array.isArray(l) && l.length ? l : null;
  } catch {
    return null;
  }
})();
// Use no lugar de useCurrentFrame() em tudo que anima (fora da checagem é exatamente o mesmo quadro).
export const useQuadro = () => {
  const f = useCurrentFrame();
  return QA_QUADROS ? QA_QUADROS[Math.min(f, QA_QUADROS.length - 1)] : f;
};

const n3 = (x: number) => Math.round(x * 1000) / 1000;
const r3 = (v: THREE.Vector3) => [n3(v.x), n3(v.y), n3(v.z)];
export const qaLog = (dado: Record<string, unknown>) => {
  // eslint-disable-next-line no-console
  console.log('QA|' + JSON.stringify(dado));
};

const caixaDe = (obj: THREE.Object3D) => {
  obj.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(obj, true);
};
// (v1.1, mantido para vídeos antigos)
export const qaCaixa = (q: number, id: string, tipo: 'caixa' | 'corpo', obj: THREE.Object3D, ignora?: string[]) => {
  const b = caixaDe(obj);
  if (b.isEmpty()) return;
  qaLog({q, tipo, id, min: r3(b.min), max: r3(b.max), ignora});
};
export const qaPe = (q: number, id: string, lado: 'E' | 'D', obj: THREE.Object3D, apoio: boolean) => {
  const b = caixaDe(obj);
  if (b.isEmpty()) return;
  const c = new THREE.Vector3();
  b.getCenter(c);
  qaLog({q, tipo: 'pe', id, lado, p: [n3(c.x), n3(b.min.y), n3(c.z)], apoio, min: r3(b.min), max: r3(b.max)});
};

// Marque o que é um objeto só (móvel, aparelho, plataforma). Peças de DENTRO do mesmo <Solido> podem se encostar;
// peças de sólidos diferentes, não. `ignora`: ids que PODEM entrar nele de propósito (a moeda que entra no cofrinho).
// Sem <Solido>, cada grupo de primeiro nível da cena conta como um objeto.
export const Solido: React.FC<{id?: string; ignora?: string[]; children: React.ReactNode}> = ({id, ignora, children}) => (
  <group userData={{qa: 'solido', id, ignora}}>{children}</group>
);
// Marca efeitos que podem cruzar objetos de propósito (raio, onda, brilho, fantasma, seta): a checagem não os trata
// como sólidos. As peças de diagrama da biblioteca já se marcam sozinhas.
export const Efeito: React.FC<{children: React.ReactNode}> = ({children}) => <group userData={{qa: 'overlay'}}>{children}</group>;

// ---------- O retrato da cena (roda no navegador, dentro do Canvas) ----------
const GEO: Record<string, string> = {BoxGeometry: 'b', RoundedBoxGeometry: 'b', PlaneGeometry: 'p', SphereGeometry: 's', CylinderGeometry: 'c', CapsuleGeometry: 'c', LatheGeometry: 'l', RingGeometry: 'r', TorusGeometry: 't'};
type Marca = {dono: string | null; donoTipo: string | null; tag: string | null; transicao: boolean; ignora?: string[]; parte?: string};
const marcas = (o: THREE.Object3D, raiz: THREE.Object3D): Marca => {
  const m: Marca = {dono: null, donoTipo: null, tag: null, transicao: false};
  let topo: THREE.Object3D = o;
  for (let p: THREE.Object3D | null = o; p && p !== raiz; p = p.parent) {
    const u = p.userData ?? {};
    if (!m.parte && u.parte) m.parte = u.parte;
    if (u.transicao) m.transicao = true;
    if (!m.tag && (u.qa === 'particula' || u.qa === 'overlay' || u.qa === 'frente' || u.qa === 'chao')) m.tag = u.qa;
    if (!m.dono && (u.qa === 'boneco' || u.qa === 'solido') && u.id) {
      m.dono = String(u.id);
      m.donoTipo = u.qa;
      m.ignora = u.ignora;
    }
    if (!m.dono && u.qa === 'solido' && !u.id) {
      m.dono = `solido:${p.uuid.slice(0, 6)}`;
      m.donoTipo = 'solido';
      m.ignora = u.ignora;
    }
    topo = p;
  }
  if (!m.dono) {
    m.dono = `grupo:${topo.uuid.slice(0, 6)}`;
    m.donoTipo = 'grupo';
  }
  return m;
};
// Identidade estável entre quadros: o caminho na cena por "assinatura" (tipo + geometria + cor) e ordem entre iguais.
const chaveDe = (o: THREE.Object3D, raiz: THREE.Object3D) => {
  const partes: string[] = [];
  for (let p: THREE.Object3D | null = o; p && p !== raiz && p.parent; p = p.parent) {
    const ass = (x: THREE.Object3D) => {
      const mesh = x as THREE.Mesh;
      const g = mesh.geometry ? mesh.geometry.type : '';
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      const c = mat && !Array.isArray(mat) && mat.color ? mat.color.getHexString() : '';
      return `${x.type}${g}${c}${x.userData?.id ?? ''}`;
    };
    const a = ass(p);
    let n = 0;
    for (const irmao of p.parent.children) {
      if (irmao === p) break;
      if (ass(irmao) === a) n++;
    }
    partes.push(`${a}#${n}`);
  }
  let h = 5381;
  const s = partes.join('/');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export const QaCena: React.FC<{cam: Cam}> = ({cam}) => {
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const q = useQuadro();
  const feito = useRef(-1);
  useLayoutEffect(() => {
    if (!QA_LIGADO || feito.current === q) return;
    feito.current = q;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const W = 1080;
    const H = 1920;
    const tela = (p: THREE.Vector3) => {
      const v = p.clone().project(camera);
      return {x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, atras: p.clone().applyMatrix4(camera.matrixWorldInverse).z > -camera.near};
    };
    const m: unknown[] = [];
    const opacos: THREE.Object3D[] = [];
    const bonecos = new Map<string, {cabeca?: THREE.Vector3; raioCab: number; min: THREE.Vector2; max: THREE.Vector2}>();
    const v = new THREE.Vector3();
    scene.traverseVisible((o) => {
      const mesh = o as THREE.Mesh;
      if (!(mesh.isMesh || (o as THREE.InstancedMesh).isInstancedMesh) || !mesh.geometry) return;
      const mk = marcas(o, scene);
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const op = mat ? (mat.transparent ? mat.opacity : 1) * (mat.visible === false ? 0 : 1) : 1;
      const basico = mat ? (mat as unknown as THREE.MeshBasicMaterial).isMeshBasicMaterial === true : false;
      const inst = (o as THREE.InstancedMesh).isInstancedMesh;
      // peça em corte (clippingPlanes) é oca na tela; multidão/instâncias: a caixa de fora não diz onde cada uma está
      const cortada = Boolean(mat && (mat as THREE.Material).clippingPlanes && (mat as THREE.Material).clippingPlanes!.length);
      const tag = mk.tag ?? (op < 0.5 ? 'overlay' : cortada ? 'corte' : inst ? 'instancia' : null);
      let centro: THREE.Vector3;
      let eixos: THREE.Vector3[];
      if (inst) {
        const b = new THREE.Box3().setFromObject(o, true);
        if (b.isEmpty()) return;
        centro = b.getCenter(new THREE.Vector3());
        const s = b.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        eixos = [new THREE.Vector3(s.x, 0, 0), new THREE.Vector3(0, s.y, 0), new THREE.Vector3(0, 0, s.z)];
      } else {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox!;
        const cl = bb.getCenter(new THREE.Vector3());
        const sl = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        centro = cl.clone().applyMatrix4(o.matrixWorld);
        const e = o.matrixWorld.elements;
        eixos = [
          new THREE.Vector3(e[0], e[1], e[2]).multiplyScalar(sl.x),
          new THREE.Vector3(e[4], e[5], e[6]).multiplyScalar(sl.y),
          new THREE.Vector3(e[8], e[9], e[10]).multiplyScalar(sl.z),
        ];
      }
      // retângulo na tela (sem cortar nas bordas: dá para saber se entrou pela borda ou surgiu do nada)
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      let todosAtras = true;
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
        v.copy(centro).addScaledVector(eixos[0], a).addScaledVector(eixos[1], b).addScaledVector(eixos[2], c);
        const s = tela(v);
        if (!s.atras) todosAtras = false;
        x0 = Math.min(x0, s.x);
        y0 = Math.min(y0, s.y);
        x1 = Math.max(x1, s.x);
        y1 = Math.max(y1, s.y);
      }
      if (todosAtras) x0 = y0 = x1 = y1 = -9999;
      // partícula: maior raio de uma instância na tela
      let rPart = 0;
      if (inst && tag === 'particula') {
        const im = o as THREE.InstancedMesh;
        const mt = new THREE.Matrix4();
        const p = new THREE.Vector3();
        const qt = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        if (!im.geometry.boundingSphere) im.geometry.computeBoundingSphere();
        const r0 = im.geometry.boundingSphere?.radius ?? 1;
        for (let i = 0; i < im.count; i++) {
          im.getMatrixAt(i, mt);
          mt.premultiply(im.matrixWorld).decompose(p, qt, sc);
          const r = r0 * Math.max(sc.x, sc.y, sc.z);
          if (r <= 0) continue;
          const dcam = p.distanceTo(camera.position);
          const px = (r / Math.max(0.001, dcam)) / Math.tan((camera.fov * Math.PI) / 360) * (H / 2);
          rPart = Math.max(rPart, px);
        }
      }
      const g = GEO[mesh.geometry.type] ?? 'o';
      const chave = chaveDe(o, scene);
      m.push([chave, mk.dono, mk.donoTipo, tag, mk.transicao ? 1 : 0, g, n3(op), ...r3(centro), ...eixos.flatMap(r3), Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), Math.round(rPart), mk.ignora ?? null]);
      if (!tag && op >= 0.6 && !basico) opacos.push(o);
      if (mk.donoTipo === 'boneco' && mk.dono) {
        const bo = bonecos.get(mk.dono) ?? {raioCab: 0, min: new THREE.Vector2(Infinity, Infinity), max: new THREE.Vector2(-Infinity, -Infinity)};
        if (!todosAtras) {
          bo.min.set(Math.min(bo.min.x, x0), Math.min(bo.min.y, y0));
          bo.max.set(Math.max(bo.max.x, x1), Math.max(bo.max.y, y1));
        }
        if (mk.parte === 'cabeca') {
          bo.cabeca = centro.clone();
          bo.raioCab = eixos[1].length();
        }
        bonecos.set(mk.dono, bo);
      }
    });
    // assunto tapado: algo opaco entre a câmera e cada alvo
    const ray = new THREE.Raycaster();
    const tapado: unknown[] = [];
    const alvos = cam.alvos && cam.alvos.length ? [...cam.alvos, cam.alvo] : [cam.alvo];
    const origem = camera.position.clone();
    alvos.forEach((a, i) => {
      const alvo = new THREE.Vector3(...a);
      const d = alvo.distanceTo(origem);
      ray.set(origem, alvo.clone().sub(origem).normalize());
      ray.far = d;
      const hits = ray.intersectObjects(opacos, false);
      for (const h of hits) {
        if (h.distance > d * 0.85 - 0.05) break;
        const b = new THREE.Box3().setFromObject(h.object, true).expandByScalar(0.05);
        if (b.containsPoint(alvo)) continue;
        const dono = marcas(h.object, scene);
        if (dono.donoTipo === 'boneco' && cam.ombro) continue;
        tapado.push({i, dono: dono.dono, onde: r3(h.point), d: n3(h.distance), dAlvo: n3(d)});
        break;
      }
    });
    const bs = [...bonecos.entries()].map(([id, b]) => {
      const cab = b.cabeca ? tela(b.cabeca) : null;
      const rpx = b.cabeca ? (b.raioCab / Math.max(0.01, b.cabeca.distanceTo(camera.position))) / Math.tan((camera.fov * Math.PI) / 360) * (H / 2) : 0;
      return {id, cab: cab && !cab.atras ? [Math.round(cab.x), Math.round(cab.y), Math.round(rpx)] : null, ret: [Math.round(b.min.x), Math.round(b.min.y), Math.round(b.max.x), Math.round(b.max.y)]};
    });
    const alvosTela = (cam.alvos ?? []).map((a) => {
      const s = tela(new THREE.Vector3(...a));
      return s.atras ? null : [Math.round(s.x), Math.round(s.y)];
    });
    qaLog({q, tipo: 'cena', cam: {pos: cam.pos.map(n3), alvo: cam.alvo.map(n3), fov: n3(camera.fov), near: n3(camera.near), ombro: Boolean(cam.ombro)}, alvos: alvosTela, temAlvos: Boolean(cam.alvos?.length), m, tapado, bonecos: bs});
  });
  return null;
};
