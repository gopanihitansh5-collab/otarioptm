import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const instrument = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://github.com/gopanihitansh5-collab/otarioptm"),
  title: "OtariOptm - Intelligent AI Orchestration",
  description:
    "Route every AI workload to the right model. Control spending, monitor every execution, one unified gateway built on the Otari hosted gateway.",
  keywords: [
    "AI gateway",
    "LLM routing",
    "cost optimization",
    "budget enforcement",
    "AI workflows",
    "Otari",
  ],
  openGraph: {
    title: "OtariOptm - Intelligent AI Orchestration",
    description:
      "Every AI request deserves a smarter route. Less cost, more intelligence, full budget control.",
    type: "website",
    siteName: "OtariOptm",
  },
  twitter: {
    card: "summary_large_image",
    title: "OtariOptm - Intelligent AI Orchestration",
    description:
      "Visual AI workflows with cost-aware routing and hard budget enforcement.",
  },
};

export const viewport: Viewport = {
  themeColor: "#111110",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${instrument.variable} ${plexMono.variable} bg-obsidian text-ice antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
