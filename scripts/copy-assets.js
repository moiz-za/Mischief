const { copyFileSync, mkdirSync, readdirSync, statSync } = require("fs");
const { join } = require("path");

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const from = join(src, entry);
    const to = join(dest, entry);
    if (statSync(from).isDirectory()) {
      copyDir(from, to);
    } else {
      copyFileSync(from, to);
    }
  }
}

copyDir(join(__dirname, "..", "src", "renderer"), join(__dirname, "..", "dist", "renderer"));
copyDir(join(__dirname, "..", "src", "assets"), join(__dirname, "..", "dist", "assets"));
