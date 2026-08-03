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

// Bundle the example experience packs so they are available to the runtime in
// dev and packaged builds. The runtime validates each pack at load time.
const examplesDir = join(__dirname, "..", "examples", "experiences");
if (existsSync(examplesDir)) {
  for (const pack of readdirSync(examplesDir)) {
    const packPath = join(examplesDir, pack);
    if (statSync(packPath).isDirectory()) {
      copyDir(packPath, join(__dirname, "..", "dist", "renderer", "experiences", pack));
    }
  }
}

function existsSync(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}
