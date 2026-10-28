/**
 * How diagrams look. The defaults of the library give square purple boxes, tiny
 * text once a wide diagram is squeezed onto a phone, and long labels that stretch
 * the decision diamonds. These settings give rounded cards, a readable size and
 * wrapped labels, and three ready-made classes authors (and the assistant) can use.
 */
export const MERMAID_CONFIG = {
  startOnLoad: false,
  // Document text is data, not markup: scripts and event handlers are removed. The
  // rest is refused in mermaid-safety.ts, which strict mode alone does not do.
  securityLevel: "strict" as const,
  suppressErrorRendering: true,
  theme: "base" as const,
  themeVariables: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "16px",
    primaryColor: "#eff6ff",
    primaryBorderColor: "#93c5fd",
    primaryTextColor: "#1e3a8a",
    lineColor: "#94a3b8",
    edgeLabelBackground: "#ffffff",
  },
  // Soft, rounded cards with a light shadow and pill-shaped answer labels, so a flow
  // reads like a checklist of steps rather than an engineering drawing.
  themeCSS: [
    ".node rect,.node path,.node polygon{rx:16;ry:16;stroke-width:2px;filter:drop-shadow(0 2px 3px rgba(15,23,42,.10))}",
    ".nodeLabel,.label{font-weight:500}",
    ".edgeLabel{font-size:13px;font-weight:600;color:#475569}",
    ".edgeLabel rect,.labelBkg{rx:12;ry:12;border-radius:12px}",
    ".flowchart-link{stroke-width:2px}",
  ].join(""),
  flowchart: { curve: "basis" as const, padding: 18, nodeSpacing: 40, rankSpacing: 48, wrappingWidth: 170, htmlLabels: true },
};

/**
 * Ready-made classes: `A(["Mulai"]):::start`, `C("Setuju?"):::decision`,
 * `X["Lengkapi dulu"]:::stop`, `Z(["Selesai"]):::done`. A question is a rounded
 * box, not a diamond: the diamond is what makes a diagram look technical.
 */
const CLASS_DEFS = [
  "classDef start fill:#dcfce7,stroke:#4ade80,color:#14532d",
  "classDef decision fill:#fef3c7,stroke:#fbbf24,color:#78350f",
  "classDef stop fill:#ffe4e6,stroke:#fb7185,color:#881337",
  "classDef done fill:#ede9fe,stroke:#a78bfa,color:#4c1d95",
].join("\n");

/** Adds the ready-made classes to a flowchart that does not define its own; other diagram types are left alone. */
export function withDefaultClasses(chart: string): string {
  if (!/^\s*(flowchart|graph)\b/i.test(chart)) return chart;
  if (/\bclassDef\s+(start|decision|stop|done)\b/.test(chart)) return chart;
  return `${chart.replace(/\s+$/, "")}\n${CLASS_DEFS}\n`;
}

/** The natural width of a rendered diagram, from its viewBox; null when it cannot be read. */
export function naturalWidth(svg: string): number | null {
  const match = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/.exec(svg);
  return match ? Math.round(Number(match[1])) : null;
}
