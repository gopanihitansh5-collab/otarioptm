# OtariOptm design system (MASTER.md)

Single source of truth for the visual identity. Derived from the validated design brief
("AI orchestration control plane" direction) and the chatbot's design document. Every
implementation decision references this file. Audit findings are reconciled against the
theses below, including the `Allowed patterns:` line.

## Visual thesis

Dark precision-engineering control plane: obsidian and graphite surfaces with steel
hairlines, electric lime reserved for routing energy, primary CTAs and budget health,
signal cyan strictly for live data flows, ice-white display type at high contrast sizes,
mono type reserved for code and metrics metadata, thin borders instead of shadows,
panel-shaped components with 8-12px radius that read as an operations OS rather than
marketing cards. Preserves the existing palette; extends it to the missing sections.

## Interaction thesis

Engineered, restrained motion: micro-interactions 150-200ms (hover lift 3-5px, arrow
nudge, brightness increase, active scale 0.98); node activation 300ms; section reveals
500-700ms fade-plus-translate with small stagger; data-flow particle loops 1.5-2.5s only
on live-state demo visuals and always paired with a replay/reset control; count-up
counters 800-1200ms on measured values only; reduced-motion renders the static
compromise of every loop. Forbidden: bounce or elastic easing, glassmorphism panels,
gradient text, neon borders, fake live activity or fabricated savings, decorative
perpetual motion outside named demo visuals, mouse-followers beyond the hero's subtle
parallax, autoplay audio.

Allowed patterns: mono eyebrow labels (also numbered steps 01/02/03, named in the brief);
steel hairline rules and hairline row separators where the content is tabular; glow only
on the primary CTA and only as a subtle ambient illumination; looping data-flow particles
inside the hero trace panel, the routing simulator, the pinned demo graph and the
architecture trace, each reporting a demo state the user can trigger or replay; DEMO MODE
or ILLUSTRATIVE labels on every non-live value; count-up counters only on real gateway
snapshots; subtle radial background illumination and slow hero particles, static under
reduced motion.

## Dials

- variance 6: split hero, asymmetric emphasis, disciplined panel variety
- motion 6: full reveal system plus live-state loops, all restrained
- density 3: generous section spacing, airy panels

## Color tokens

| Token | Hex | Role |
|---|---|---|
| obsidian | #090B0D | page background |
| graphite | #111519 | section background |
| elevated | #171D22 | cards and panels |
| steel | #293239 | borders and dividers |
| steel-dim | #1C2429 | hairlines inside panels |
| lime | #C6F36B | primary accent: CTAs, routing, budget health |
| lime-ink | #10140A | text on lime |
| ice | #F3F5F2 | primary text |
| silver | #929DA5 | secondary text |
| cyan | #65C9E8 | data flows and live data only |
| amber | #E8B44A | latency warnings |
| red | #E05353 | failed requests, blocked runs |

Usage ratio: 70 percent dark surfaces, 20 percent neutral typography, 7 percent lime, 3
percent cyan/amber/red. Contrast: ice on obsidian passes; silver on graphite for body
copy; lime-ink on lime passes for CTA labels; cyan never used for long text.

## Typography

- Interface display: Inter via next/font, fallback ui-sans-serif, system-ui, Segoe UI,
  Roboto, Helvetica, Arial, sans-serif. Display 64-76px hero, 40-48px sections, 18-20px
  card titles, 15-17 body, 13-14 nav, 11-12 metadata.
- Mono: IBM Plex Mono via next/font, fallback ui-monospace, SFMono-Regular, Menlo,
  Consolas, monospace. Reserved for eyebrows, metrics, code, IDs, table figures.
- Weight usage: 600 for headings, 400/500 for body, mono 400-500 with letter-spacing on
  labels.

## Spacing and shape

- Base unit 4px; section rhythm py-20/md:py-24 (80/96px), hero pt-14.
- Container: max-w-6xl, px-4 md:px-6.
- Radii: 8px buttons and inputs, 12px cards and panels, 16px hero panel.
- Elevation: borders over shadows; one subtle radial illumination per section, never
  gradient fills on cards.

## Motion tokens

| Token | Value | Use |
|---|---|---|
| fast | 150ms | hovers, arrow nudges |
| base | 200ms | card lift, color transitions, tabs |
| activate | 300ms | node and chip activation |
| reveal | 500ms | section fade+translate (700 desktop) |
| flow | 1.5-2.5s | particle loops inside demo visuals |
| count | 900ms | count-up on real metrics |
| easing | cubic-bezier(0.22, 0.61, 0.36, 1) | out, sharp, no overshoot |

## Components

- Buttons: primary h-11/12 lemon fill, lime-ink text, hover brightness 110, active scale
  0.98, focus ring lime 50 percent. Secondary: steel border, silver text, hover lime
  border and text. Ghost: underline-style links with nudge arrows.
- Panels: elevated surface, steel border, hover lift 3px and border wash to lime-dim.
- Eyebrow: mono 10px, tracking 0.25em, lime, often numbered.
- Status chips: mono 9-10px, bordered, tracking-widest; lime when active, silver when
  idle.
- Code blocks: obsidian base, silver text, cyan for values, copy button top right.
- Accordion: hairline separators, rotation glyph, aria-expanded, no glass.

## Accessibility

- Focus visible everywhere, lime ring.
- Reduced motion: all loops static, reveals render visible instantly, transition-none on
  lift.
- Every interactive element keyboard reachable; demo controls use buttons with
  aria-pressed; accordions use aria-expanded aria-controls.
- No fabricated metrics anywhere; live sections degrade to an honest offline card.

## Implementation map

- Tokens: web/src/app/globals.css.
- Reveal utilities: web/src/lib/landing/Reveal.tsx.
- Fonts: web/src/app/layout.tsx via next/font/google (Inter, IBM Plex Mono).
- Sections live in web/src/components/landing.
