// Builds src/data/oui.json, a compact MAC prefix -> vendor table from the IEEE
// registry (via the `oui-data` package). Run with `pnpm build:oui`.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(require.resolve("oui-data"), "utf8"));

// Drop legal suffixes so names are short and readable in the UI.
const tidy = (s) =>
  s
    .split("\n")[0]
    .replace(/[,.]?\s+(co\.?,?\s*)?(ltd|limited|inc|incorporated|corp|corporation|gmbh|llc|s\.?a\.?|b\.?v\.?|ag|plc|pte|oy|ab)\.?$/i, "")
    .replace(/[,.]?\s+(co\.?,?\s*)?(ltd|limited|inc|corp|corporation)\.?$/i, "")
    .trim();

const vendors = [];
const index = new Map();
let packed = "";
for (const [oui, raw] of Object.entries(data)) {
  if (oui.length !== 6) continue;
  const name = tidy(raw);
  if (!name || /^private$/i.test(name)) continue;
  let i = index.get(name);
  if (i === undefined) {
    i = vendors.length;
    vendors.push(name);
    index.set(name, i);
  }
  packed += oui + i.toString(36) + ",";
}
writeFileSync("src/data/oui.json", JSON.stringify({ vendors, packed: packed.slice(0, -1) }));
console.log(`${index.size} vendors, ${packed.length} bytes of prefixes`);
