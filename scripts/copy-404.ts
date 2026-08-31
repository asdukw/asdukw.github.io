// Cloudflare Pages SPA fallback: serve index.html for all non-asset routes.
// NOTE: do NOT emit a top-level 404.html here — Cloudflare Pages only enables
// its native SPA rendering when there is no top-level 404.html.
await Bun.write("dist/_redirects", "/*  /index.html  200\n");
console.log("✓ _redirects → dist/_redirects (Cloudflare Pages SPA fallback)");
