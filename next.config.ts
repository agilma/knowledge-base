import withSerwistInit from "@serwist/next";
import { EMBED_FRAME_HOSTS } from "./src/lib/embed";

const offlineRevision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  Date.now().toString();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision: offlineRevision }],
});

// Frames only from the hosts a ```sematan block can name (src/lib/embed.ts), and the Vercel preview
// toolbar. This is the only directive: it limits what a page may put in a frame and leaves scripts,
// styles and images as they are. Even if a document held a frame some other way, the browser would
// refuse it.
const FRAME_SRC = ["'self'", ...EMBED_FRAME_HOSTS, "https://vercel.live"].join(" ");

export default withSerwist({
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: `frame-src ${FRAME_SRC}` }] }];
  },
});
