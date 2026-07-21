import { readFile, writeFile } from "node:fs/promises";

const packagePaths = [
  new URL("../node_modules/@better-auth/telemetry/package.json", import.meta.url),
  new URL("../node_modules/@better-auth/utils/package.json", import.meta.url),
];

function removeBunIncompatibleConditions(value) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value)) {
    delete value.node;
    delete value.workerd;
  }
  for (const child of Object.values(value)) removeBunIncompatibleConditions(child);
}

for (const packagePath of packagePaths) {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  // Vercel's Bun tracer includes default ESM entries but omits conditional
  // Node files. Bun supports the default Web Crypto implementations directly.
  removeBunIncompatibleConditions(packageJson.exports);
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}
