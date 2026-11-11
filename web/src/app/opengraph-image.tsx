import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OtariOptm: every AI request deserves a smarter route. Cost-aware orchestration on the Otari gateway.";

/**
 * Static 1200x630 OG card on the obsidian control-plane surface: steel
 * hairline grid, mono eyebrow, ice display headline, lime accent bar.
 * The Inter display face and IBM Plex Mono label face are fetched at render
 * time to match the product's type system; if the fetches fail (offline
 * build) the bundled default sans-serif is used instead and the card still
 * renders.
 */
async function fetchTtf(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`,
      { headers: { "User-Agent": "curl/8" }, cache: "force-cache" },
    );
    if (!css.ok) return null;
    const match = (await css.text()).match(/url\((https:[^)]+\.ttf)\)/);
    if (!match) return null;
    const ttf = await fetch(match[1], { cache: "force-cache" });
    if (!ttf.ok) return null;
    return await ttf.arrayBuffer();
  } catch {
    return null;
  }
}

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600;
  style: "normal";
};

export default async function OpengraphImage() {
  const [inter400, inter600, monoData] = await Promise.all([
    fetchTtf("Inter", 400),
    fetchTtf("Inter", 600),
    fetchTtf("IBM Plex Mono", 400),
  ]);

  // Satori resolves each family against registered fonts only, so every
  // family string below must name a font that was actually loaded.
  const fonts: OgFont[] = [];
  if (inter400)
    fonts.push({ name: "Inter", data: inter400, weight: 400, style: "normal" });
  if (inter600)
    fonts.push({ name: "Inter", data: inter600, weight: 600, style: "normal" });
  if (monoData)
    fonts.push({
      name: "IBM Plex Mono",
      data: monoData,
      weight: 400,
      style: "normal",
    });

  const displayFamily = inter400
    ? "Inter"
    : monoData
      ? "IBM Plex Mono"
      : "sans-serif";
  const monoFamily = monoData
    ? "IBM Plex Mono"
    : inter400
      ? "Inter"
      : "sans-serif";

  const verticals = Array.from({ length: 12 }, (_, i) => (i + 1) * 100);
  const horizontals = Array.from({ length: 6 }, (_, i) => (i + 1) * 90);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#111110",
          color: "#E9E4DA",
        }}
      >
        {/* steel hairline grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
          }}
        >
          {verticals.map((x) => (
            <div
              key={`v${x}`}
              style={{
                position: "absolute",
                left: x,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: "rgba(41,50,57,0.5)",
              }}
            />
          ))}
          {horizontals.map((y) => (
            <div
              key={`h${y}`}
              style={{
                position: "absolute",
                top: y,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: "rgba(41,50,57,0.5)",
              }}
            />
          ))}
        </div>

        {/* subtle radial illumination */}
        <div
          style={{
            position: "absolute",
            top: -220,
            left: 260,
            width: 680,
            height: 440,
            borderRadius: 9999,
            backgroundColor: "#111110",
            backgroundImage:
              "radial-gradient(circle, rgba(184,169,143,0.10) 0%, rgba(184,169,143,0) 70%)",
            display: "flex",
          }}
        />

        {/* headline block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            marginTop: 74,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: monoFamily,
              fontSize: 21,
              letterSpacing: 7,
              color: "#B8A98F",
              textTransform: "uppercase",
            }}
          >
            OTARIOPTM // COST-AWARE ORCHESTRATION
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 34,
              fontSize: 76,
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: -2,
              fontFamily: displayFamily,
            }}
          >
            <div style={{ display: "flex" }}>Every AI request</div>
            <div style={{ display: "flex" }}>
              <span>deserves a&nbsp;</span>
              <span style={{ color: "#B8A98F" }}>smarter route</span>
              <span>.</span>
            </div>
          </div>
        </div>

        {/* lime accent bar + footer facts */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 96,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#B8A98F",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: monoFamily,
                fontSize: 17,
                letterSpacing: 3,
                color: "#A6A197",
                textTransform: "uppercase",
              }}
            >
              Every token accounted for, before it is spent
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: monoFamily,
                fontSize: 17,
                letterSpacing: 3,
                color: "#A6A197",
                textTransform: "uppercase",
              }}
            >
              Built on Otari / Mozilla AI
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
