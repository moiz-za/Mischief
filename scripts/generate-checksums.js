const { createHash } = require("crypto");
const { readFileSync, readdirSync, statSync, writeFileSync } = require("fs");
const { join } = require("path");

// Writes release/SHA256SUMS for every top-level file in the release directory
// (directories like linux-unpacked/ are excluded). Format matches
// `shasum -a 256`: "<hex>  <filename>", one per line, sorted for determinism.
//
// Only files that ship as release artifacts are included: packaging metadata
// (builder-debug.yml, latest.yml) is not attached to releases, so it must not
// be listed in the checksum file.
const dir = join(__dirname, "..", "release");
const files = readdirSync(dir)
  .filter((name) => name !== "SHA256SUMS")
  .filter((name) => !/\.ya?ml$/.test(name))
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
