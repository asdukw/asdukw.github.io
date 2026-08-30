await Bun.write("dist/favicon.ico", Bun.file("src/favicon.ico"));
console.log("✓ favicon.ico → dist/favicon.ico");