#!/usr/bin/env node
// Runs before every build/dev start (see package.json "prebuild"/"predev").
// Stamps the current commit onto the app so /summary can show which commit
// a given deploy was actually built from.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function git(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

const commit = git("git rev-parse --short HEAD", "unknown");
const commitDate = git("git log -1 --format=%cI", null);

const outPath = path.join(__dirname, "..", "src", "lib", "build-info.json");
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      commit,
      commitDate,
      builtAt: new Date().toISOString(),
    },
    null,
    2
  ) + "\n"
);
