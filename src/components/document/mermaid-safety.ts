/**
 * `securityLevel: "strict"` removes scripts and event handlers but leaves
 * images, links and CSS `url()`, which would let an author make every reader's
 * browser call an outside address. These are refused up front: `%%{` init
 * directives (they can carry `themeCSS`), `click` lines (links), `url(` and any
 * HTML tag other than `<br>` (`<-->` style arrows are not tags).
 */
export function unsafeDiagramReason(chart: string): string | null {
  // YAML frontmatter (`---` + `config:`) is a second way in for `themeCSS`, and a backslash
  // lets CSS spell `url(` as `\75rl(`; neither is needed to write a flow.
  if (/^\s*---/.test(chart)) return "pengaturan di awal diagram (---) tidak diizinkan";
  if (chart.includes("\\")) return "karakter \\ tidak diizinkan";
  if (/%%\{/.test(chart)) return "pengaturan %%{...}%% tidak diizinkan";
  if (/^\s*click\s/im.test(chart)) return "perintah click (tautan) tidak diizinkan";
  if (/url\s*\(/i.test(chart)) return "url() tidak diizinkan";
  if (/<(?![-=.]|br\s*\/?>)/i.test(chart)) return "tag HTML tidak diizinkan (kecuali <br>)";
  return null;
}
