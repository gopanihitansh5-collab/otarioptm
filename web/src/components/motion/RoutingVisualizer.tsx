"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

/**
 * RoutingVisualizer - sculptural champagne-titanium routing engine.
 *
 * A metallic engine core with provider nodes that assemble into orbit on
 * mount, a slow ambient rotation, and a champagne pulse travelling
 * ingress -> engine -> active provider on a loop.
 *
 * ILLUSTRATIVE: this is a decorative signature object, not live routing
 * state. The component renders its own caption saying so.
 *
 * Fallbacks: reduced motion, no WebGL, or small screens get a static SVG
 * diagram with identical information. The render loop pauses offscreen.
 * No new dependencies (three / @react-three/fiber are already installed).
 */

const CHAMPAGNE = "#b8a98f";
const CHAMPAGNE_BRIGHT = "#d8cbb8";
const TAUPE = "#8a7f6e";
const STEEL = "#9aa4ad";
const ICE = "#e9e4da";

/** Small canvas-texture sprite label with a dark pill background, so the
 * label stays readable over dark and light page themes. */
function makeLabelSprite(text: string, active: boolean): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "rgba(17, 17, 16, 0.88)";
    g.beginPath();
    g.roundRect(8, 10, 240, 44, 14);
    g.fill();
    g.font = "600 22px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = active ? CHAMPAGNE_BRIGHT : ICE;
    g.fillText(text, 128, 33);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(1.05, 0.26, 1);
  return sprite;
}

const PROVIDERS = [
  { name: "OTARI", angle: -90 },
  { name: "QWEN", angle: -18 },
  { name: "GPT-4O-MINI", angle: 54 },
  { name: "CLAUDE", angle: 126 },
  { name: "GROQ", angle: 198 },
];

function useInView(ref: React.RefObject<HTMLDivElement | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { rootMargin: "80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function ProviderNode({
  name,
  angle,
  active,
}: {
  name: string;
  angle: number;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const scatter = useMemo(() => {
    // Deterministic scatter so SSR and first client frame agree.
    const a = (angle * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(a * 2.7) * 5.2,
      Math.sin(a * 1.9) * 3.4,
      Math.sin(a * 3.1) * 2.6,
    );
  }, [angle]);
  const target = useMemo(() => {
    const a = (angle * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9);
  }, [angle]);

  const label = useMemo(() => makeLabelSprite(name, active), [name, active]);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    // Clock-driven assembly: scattered -> orbit over ~2.2s, no re-renders.
    const a = Math.min(1, clock.elapsedTime / 2.2);
    const eased = 1 - Math.pow(1 - a, 3);
    m.position.lerpVectors(scatter, target, eased);
    const s = active ? 1.25 : 1;
    m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, s, 0.08));
    label.position.set(0, 0.42, 0);
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.16, 0]} />
      <meshStandardMaterial
        color={active ? CHAMPAGNE_BRIGHT : STEEL}
        emissive={active ? CHAMPAGNE : STEEL}
        emissiveIntensity={active ? 0.9 : 0.18}
        metalness={0.85}
        roughness={0.3}
      />
      <primitive object={label} />
    </mesh>
  );
}

function RoutePulse({ curve, period = 4 }: { curve: THREE.CatmullRomCurve3; period?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = (clock.elapsedTime % period) / period;
    const p = curve.getPointAt(t);
    m.position.copy(p);
    // Fade the pulse in/out at the ends of the route.
    const fade = Math.sin(Math.PI * t);
    (m.material as THREE.MeshStandardMaterial).opacity = 0.25 + 0.75 * fade;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color={CHAMPAGNE_BRIGHT}
        emissive={CHAMPAGNE}
        emissiveIntensity={1.6}
        transparent
        metalness={0.4}
        roughness={0.2}
      />
    </mesh>
  );
}

function Engine() {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12;
    if (core.current) core.current.rotation.y -= delta * 0.3;
  });

  const active = PROVIDERS[1]; // QWEN highlighted as the illustrative pick
  const activeAngle = (active.angle * Math.PI) / 180;
  const curve = useMemo(() => {
    const ingress = new THREE.Vector3(-4.6, 1.6, 0);
    const center = new THREE.Vector3(0, 0.25, 0);
    const out = new THREE.Vector3(Math.cos(activeAngle) * 2.9, 0.1, Math.sin(activeAngle) * 2.9);
    return new THREE.CatmullRomCurve3([ingress, center, out]);
  }, [activeAngle]);

  const routeLine = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
    const mat = new THREE.LineBasicMaterial({
      color: CHAMPAGNE_BRIGHT,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.Line(geo, mat);
  }, [curve]);

  return (
    <group ref={group}>
      {/* metallic core */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color={CHAMPAGNE}
          metalness={0.8}
          roughness={0.3}
          flatShading
        />
      </mesh>
      {/* wireframe shell */}
      <mesh>
        <icosahedronGeometry args={[1.12, 1]} />
        <meshBasicMaterial color={ICE} wireframe transparent opacity={0.16} />
      </mesh>
      {/* orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.9, 0.006, 8, 96]} />
        <meshBasicMaterial color={TAUPE} transparent opacity={0.5} />
      </mesh>
      {/* route path */}
      <primitive object={routeLine} />
      <RoutePulse curve={curve} />
      {PROVIDERS.map((p) => (
        <ProviderNode key={p.name} name={p.name} angle={p.angle} active={p.name === active.name} />
      ))}
    </group>
  );
}

/** Static fallback: identical information as an SVG diagram. */
function StaticTrace() {
  return (
    <svg viewBox="0 0 640 420" className="h-full w-full" role="img"
      aria-label="Illustrative routing diagram: requests enter from the left, pass through the OtariOptm engine, and route to one of five provider nodes.">
      <rect width="640" height="420" fill="none" />
      <ellipse cx="320" cy="210" rx="185" ry="120" fill="none" stroke={TAUPE} strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M 60 90 C 170 90, 220 190, 320 200 C 400 208, 430 190, 462 176" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="5 6" />
      <polygon points="320,150 372,180 372,240 320,270 268,240 268,180" fill="none" stroke={ICE} strokeOpacity="0.35" strokeWidth="1.5" />
      <polygon points="320,176 350,193 350,227 320,244 290,227 290,193" fill={CHAMPAGNE} fillOpacity="0.9" />
      {[
        { x: 462, y: 176, n: "QWEN", a: true },
        { x: 500, y: 300, n: "GPT-4O-MINI", a: false },
        { x: 320, y: 352, n: "CLAUDE", a: false },
        { x: 140, y: 300, n: "GROQ", a: false },
        { x: 138, y: 122, n: "OTARI", a: false },
      ].map((p) => (
        <g key={p.n}>
          <rect x={p.x - 9} y={p.y - 9} width="18" height="18"
            transform={`rotate(45 ${p.x} ${p.y})`}
            fill={p.a ? CHAMPAGNE_BRIGHT : STEEL} />
          <text x={p.x} y={p.y + 28} textAnchor="middle" fontSize="11"
            fontFamily="ui-monospace, Menlo, monospace"
            fill={p.a ? CHAMPAGNE_BRIGHT : "#929DA5"}>{p.n}</text>
        </g>
      ))}
      <text x="60" y="74" fontSize="11" fontFamily="ui-monospace, Menlo, monospace" fill="#929DA5">INGRESS</text>
      <text x="320" y="300" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, Menlo, monospace" fill={ICE}>ENGINE</text>
    </svg>
  );
}

export default function RoutingVisualizer({
  className,
  caption = "Illustrative routing visualization - the actual routing decision runs in the gateway.",
}: {
  className?: string;
  caption?: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef);
  const reduced = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState(false);
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSmall(window.innerWidth < 640);
      try {
        const c = document.createElement("canvas");
        if (c.getContext("webgl2") || c.getContext("webgl")) setWebgl(true);
      } catch {
        /* keep the static trace */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const use3D = webgl && !reduced && !small;

  return (
    <div className={className}>
      <div
        ref={wrapRef}
        style={{ position: "relative", width: "100%", aspectRatio: "640 / 420" }}
      >
        {use3D ? (
          <Canvas
            dpr={[1, 1.5]}
            frameloop={inView ? "always" : "never"}
            camera={{ position: [0, 2.6, 6.6], fov: 42 }}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            aria-hidden
          >
            <ambientLight intensity={0.85} color="#f0e6d6" />
            <directionalLight position={[4, 6, 4]} intensity={2.2} color={CHAMPAGNE_BRIGHT} />
            <directionalLight position={[-5, 2, -3]} intensity={0.8} color="#8995a0" />
            <pointLight position={[0, 1.2, 3.2]} intensity={6} color={CHAMPAGNE} />
            <Engine />
          </Canvas>
        ) : (
          <StaticTrace />
        )}
      </div>
      {caption !== null && (
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.72rem",
            lineHeight: 1.4,
            color: "var(--color-muted, #929da5)",
            fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)",
            letterSpacing: "0.04em",
          }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}
