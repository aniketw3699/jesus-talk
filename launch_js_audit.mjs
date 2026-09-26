import fs from "node:fs";

const failures = [];

function parseScript(name, source) {
  try {
    new Function(source);
  } catch (error) {
    failures.push(name + ": " + error.message);
  }
}

for (const file of [
  "service-worker.js",
  "offline-core.js",
  "local-scripture-data.js",
  "local-experiences.js",
  "local-bible-engine.js",
  "bible-manifest.js",
  "billing-config.js",
  "private-sync.js",
  "blog-player.js"
]) {
  if (!fs.existsSync(file)) {
    failures.push(file + ": missing");
    continue;
  }
  parseScript(file, fs.readFileSync(file, "utf8"));
}

for (const file of ["index.html", "bible.html", "blessing.html"]) {
  const html = fs.readFileSync(file, "utf8");
  const regex = /<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let index = 0;
  while ((match = regex.exec(html)) !== null) {
    const source = match[1].trim();
    if (!source) continue;
    index += 1;
    parseScript(file + " inline script " + index, source);
  }
}

try {
  JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
} catch (error) {
  failures.push("manifest.webmanifest: " + error.message);
}

if (failures.length) {
  console.error("JavaScript/manifest audit failed:");
  failures.forEach(item => console.error(" - " + item));
  process.exit(1);
}

console.log("PASS: key JavaScript, inline scripts, and PWA manifest parse successfully.");
