const { existsSync, readFileSync, readdirSync, statSync } = require("fs");
const { join } = require("path");

// Validates every Experience Pack under examples/experiences using the same
// strict loader the runtime uses (src/domain/pack.ts). Run with:
//   npm run validate:packs
const { loadExperiencePack } = require("../dist/domain/pack.js");

const baseDir = join(__dirname, "..", "examples", "experiences");
const packs = readdirSync(baseDir)
  .filter((entry) => statSync(join(baseDir, entry)).isDirectory())
  .filter((entry) => existsSync(join(baseDir, entry, "manifest.json")));

let failed = false;

for (const packId of packs) {
  const packDir = join(baseDir, packId);
  const reader = {
    exists(relative) {
      return existsSync(join(packDir, relative));
    },
    readText(relative) {
      try {
        return readFileSync(join(packDir, relative), "utf8");
      } catch {
        return null;
      }
    },
  };
  const result = loadExperiencePack(reader);
  if (!result.pack) {
    failed = true;
    console.error(`[FAIL] ${packId}`);
    for (const issue of result.errors) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  } else {
    console.log(`[OK]   ${packId} — ${result.pack.manifest.name}`);
  }
}

if (packs.length === 0) {
  console.error("No experience packs found under examples/experiences/");
  process.exit(1);
}

if (failed) {
  console.error("\nOne or more packs failed validation.");
  process.exit(1);
}
console.log(`\nAll ${packs.length} pack(s) validated.`);
