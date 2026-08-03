const { createHash } = require("crypto");
const { readFileSync, readdirSync, statSync, writeFileSync } = require("fs");
const { join } = require("path");

// Writes release/SHA256SUMS for every top-level file in the release directory
// (directories like linux-unpacked/ are excluded). Format matches
// `shasum -a 256`: "<hex>  <filename>", one per line, sorted for determinism.
const dir = join(__dirname, "..", "release");
const files = readdirSync(dir)
  .filter((name) => name !== "SHA256SUMS")
  .filter((name) => statSync(join(dir, name)).isFile())
  .sort();

const lines = files.map(
  (name) =>
    `${createHash("sha256")
      .update(readFileSync(join(dir, name)))
      .digest("hex")}  ${name}`
);

writeFileSync(join(dir, "SHA256SUMS"), lines.join("\n") + "\n");
console.log(`Wrote SHA256SUMS for ${files.length} file(s).`);
