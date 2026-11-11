# Kinetic editorial motion kit

Standalone, zero-collision components for the kinetic-editorial brief. All
styles live in `motion.module.css` (scoped, token-consuming with literal
fallbacks). Nothing here edits existing landing/studio files; the integrator
wires the insertion points below.

## Files

| File | Purpose |
| --- | --- |
| `KineticType.tsx` | Hero typewriter: per-character reveal with blinking cursor and a keyboard-reachable "Skip intro" button. Caps at `maxDurationMs` (default 3000). |
| `Reveal.tsx` | One-shot IntersectionObserver reveals: `fade-up`, `mask`, or `word` (word-by-word; children must be a plain string). |
| `WordmarkSignature.tsx` | OTARIOPTM wordmark: letters blur-to-focus in sequence, then a champagne underline draws. |
| `motion.module.css` | Scoped styles incl. `gradientText` (champagne material gradient phrase). |
| `RoutingVisualizer.tsx` | Sculptural champagne-titanium routing engine (R3F): metallic core, provider nodes assembling into orbit, route pulse. Static SVG fallback for reduced-motion/no-WebGL/small screens; render loop pauses offscreen; self-rendered "Illustrative" caption. Use via `next/dynamic` with `ssr: false`. |
| `../hooks/usePrefersReducedMotion.ts` | Shared reactive reduced-motion hook. |

`RoutingVisualizer.tsx` verified by pixel screenshots in both modes.

## Guarantees

- SSR-safe: full static content at first paint, enhancement after mount only.
- No hydration-gated invisible text, no layout shift (opacity/transform/
  filter/clip-path only), no scroll hijack, no global selectors.
- prefers-reduced-motion: everything renders statically and instantly
  (matchMedia-guarded in components plus a CSS fallback block).
- Status colors (`--color-signal`, `--color-amber`, `--color-fail`) untouched.
- No new dependencies.

## Props

```tsx
<KineticType
  text="Intelligence, without the overhead."
  as="h1"               // any element; default "span"
  className="..."
  speed={40}            // chars/sec; auto-accelerates to fit maxDurationMs
  startDelay={400}      // ms
  maxDurationMs={3000}  // hard cap, default 3s
  onComplete={() => {}}
/>

<Reveal variant="fade-up" delay={120}>...</Reveal>
<Reveal variant="mask">...</Reveal>
<Reveal variant="word" wordStaggerMs={55}>Every token accounted for.</Reveal>

<WordmarkSignature text="OTARIOPTM" staggerMs={70} underline />
```

## Suggested insertion points (integrator's call)

1. Hero headline (`src/components/landing/Hero.tsx`): replace the static
   `<h1>` content with `KineticType`, tagline "Intelligence, without the
   overhead."; wrap the second phrase in a span with
   `motion.module.css`'s `gradientText` by splitting into two adjacent
   KineticType/span runs, or apply `gradientText` to a nested span after
   the animation completes.
2. Header/nav wordmark (`Nav.tsx`): swap the text wordmark for
   `<WordmarkSignature />`.
3. Section headings: `<Reveal variant="word">heading text</Reveal>`.
4. Sections: wrap in `<Reveal variant="fade-up">` (or `"mask"` for panels).

Note: the brief's scripted "system initialization" intro is an illustrative
storyboard. If built later it must stay clearly decorative, never presented
as live product initialization.

## Verified on this branch

- `npx tsc --noEmit` clean.
- `npm run lint` clean.
- `npm run build` clean.
- RoutingVisualizer pixel-verified in headless Chrome (SwiftShader WebGL):
  3D mode shows the assembled metallic scene with no console errors;
  forced reduced-motion shows the labelled static SVG diagram.
