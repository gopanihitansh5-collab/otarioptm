"use client";

/* eslint-disable react-hooks/immutability --
   React Three Fiber renders an imperative three.js scene graph: objects
   created in useMemo are scene nodes mutated every frame in useFrame by
   design, not React state. The React Compiler purity rules do not apply
   to the scene graph. */

import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Signature hero centerpiece: the OtariOptm routing engine as a wireframe
 * sphere, provider nodes orbiting it, and a light pulse that travels the
 * selected route once per loop. Rendered only when WebGL is available and
 * the user allows motion; the hero keeps its SVG loop as fallback. The
 * frameloop pauses whenever the hero leaves the viewport (adopted from the
 * harvested WebGL perf patterns), and the DPR is capped so hi-dpi screens
 * do not pay for full-resolution pixels the panel never shows.
 */

const LIME = "#C6F36B";
const CYAN = "#65C9E8";
const STEEL = "#293239";

const ORBIT_R = 2.55;
const ORBIT_Y = [0.55, -0.15, -0.75];
const BASE_ANGLE = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
const ORBIT_SPEED = 0.22;
const LOOP = 6; // seconds per routed request
const INGRESS = new THREE.Vector3(-3.4, 0.1, 0);
const NODE_NAMES = ["QWEN", "GPT-4O-MINI", "CLAUDE"];

function makeLabel(text: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.font = "600 44px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#929DA5";
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(1.15, 0.22, 1);
  return sprite;
}

function nodePos(i: number, time: number, out: THREE.Vector3) {
  const a = BASE_ANGLE[i] + time * ORBIT_SPEED;
  out.set(Math.cos(a) * ORBIT_R, ORBIT_Y[i], Math.sin(a) * ORBIT_R);
  return out;
}

function Engine() {
  const wire = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const pulseMat = useRef<THREE.MeshBasicMaterial>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const labelRefs = useRef<(THREE.Sprite | null)[]>([]);
  const labels = useMemo(() => NODE_NAMES.map(makeLabel), []);

  const lines = useMemo(
    () =>
      BASE_ANGLE.map(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(6), 3),
        );
        const m = new THREE.LineBasicMaterial({
          color: STEEL,
          transparent: true,
          opacity: 0.9,
        });
        return new THREE.Line(g, m);
      }),
    [],
  );

  const particles = useMemo(() => {
    // Seeded PRNG (mulberry32) keeps this pure: identical field every render.
    let seed = 20261110;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const n = 220;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 3.2 + rand() * 2.4;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmp2 = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const loopT = time % LOOP;
    const route = Math.floor(time / LOOP) % 3;

    if (wire.current) {
      wire.current.rotation.y = time * 0.12;
      wire.current.rotation.x = Math.sin(time * 0.1) * 0.08;
    }

    // Processing glow while the request is inside the engine.
    const processing = loopT > 1.4 && loopT < 2.4 ? 1 : 0;
    if (coreMat.current) {
      coreMat.current.opacity +=
        ((processing ? 0.5 : 0.16) - coreMat.current.opacity) * 0.12;
    }
    if (core.current) {
      const s = 1 + (processing ? 0.12 : 0) * Math.sin(time * 6);
      core.current.scale.setScalar(s);
    }

    // Orbiters and their connection lines.
    for (let i = 0; i < 3; i++) {
      nodePos(i, time, tmp);
      const node = nodeRefs.current[i];
      if (node) node.position.copy(tmp);
      const line = lines[i];
      const attr = line.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      attr.setXYZ(0, 0, 0, 0);
      attr.setXYZ(1, tmp.x, tmp.y, tmp.z);
      attr.needsUpdate = true;
      const mat = line.material as THREE.LineBasicMaterial;
      const active = i === route && loopT >= 2.4 && loopT < 4.6;
      // Lime marks the successfully selected route (brief's usage rule).
      mat.color.set(active ? LIME : "#3d4a56");
      mat.opacity = active ? 1 : 0.8;
      const label = labelRefs.current[i];
      if (label) label.position.set(tmp.x, tmp.y + 0.34, tmp.z);
      const ring = ringRefs.current[i];
      if (ring) {
        ring.position.copy(tmp);
        const flash =
          i === route && loopT >= 4.0 && loopT < 4.6
            ? 1 + (loopT - 4.0) * 2.2
            : 0.001;
        ring.scale.setScalar(flash);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          flash > 0.01 ? Math.max(0, 0.8 - (loopT - 4.0)) : 0;
      }
    }

    // The pulse: ingress -> engine -> selected provider -> fade.
    if (pulse.current && pulseMat.current) {
      let opacity = 0;
      if (loopT < 1.4) {
        const k = loopT / 1.4;
        pulse.current.position.lerpVectors(INGRESS, tmp2.set(0, 0, 0), k);
        opacity = 1;
      } else if (loopT < 2.4) {
        pulse.current.position.set(0, 0, 0);
        opacity = 0.9;
      } else if (loopT < 4.0) {
        nodePos(route, time, tmp);
        const k = (loopT - 2.4) / 1.6;
        pulse.current.position.lerpVectors(tmp2.set(0, 0, 0), tmp, k);
        opacity = 1;
      } else {
        nodePos(route, time, tmp);
        pulse.current.position.copy(tmp);
        opacity = Math.max(0, 1 - (loopT - 4.0) * 2);
      }
      pulseMat.current.opacity = opacity;
    }
  });

  return (
    <group rotation={[0.28, 0, 0]}>
      {/* routing engine */}
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshBasicMaterial color="#5a6b78" wireframe transparent opacity={0.95} />
      </mesh>
      <mesh ref={core}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial ref={coreMat} color={LIME} transparent opacity={0.16} />
      </mesh>

      {/* provider nodes */}
      {BASE_ANGLE.map((_, i) => (
        <group key={i}>
          <mesh ref={(m) => (nodeRefs.current[i] = m)}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial color={i === 1 ? LIME : CYAN} />
          </mesh>
          <mesh ref={(m) => (ringRefs.current[i] = m)}>
            <ringGeometry args={[0.16, 0.2, 32]} />
            <meshBasicMaterial
              color={LIME}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      {labels.map((s, i) => (
        <primitive
          key={i}
          object={s}
          ref={(r: THREE.Sprite | null) => {
            labelRefs.current[i] = r;
          }}
        />
      ))}

      {/* request pulse */}
      <mesh ref={pulse}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial ref={pulseMat} color={LIME} transparent opacity={0} />
      </mesh>

      {/* ambient particles */}
      <points geometry={particles}>
        <pointsMaterial
          color={CYAN}
          size={0.02}
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>

      {/* orbit ring hint */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ORBIT_R, 0.004, 8, 96]} />
        <meshBasicMaterial color={STEEL} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function RoutingScene() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  // Pause the render loop while the hero panel is offscreen; reduced-motion
  // users never reach this component because Hero gates it upstream.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { rootMargin: "80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={inView ? "always" : "never"}
        camera={{ position: [0, 0.4, 6.4], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        aria-hidden
      >
        <Engine />
      </Canvas>
    </div>
  );
}
