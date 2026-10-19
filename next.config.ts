import withSerwistInit from "@serwist/next";

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

export default withSerwist({
  /* config options here */
});
