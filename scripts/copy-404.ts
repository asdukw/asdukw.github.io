const html = await Bun.file("dist/index.html").text();

const withBase = html.replace(
  /<head>/,
  '<head>\n    <base href="/" />',
);

await Bun.write("dist/404.html", withBase);
console.log("✓ 404.html → dist/404.html (SPA fallback for GitHub Pages)");
