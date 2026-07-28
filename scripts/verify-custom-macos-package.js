#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULT_APP = path.resolve(__dirname, "../dist-custom/mac-arm64/OpenWhispr Custom.app");

function buildNativeProbe(packagedNodeModules) {
  return `
const path = require("node:path");
const root = ${JSON.stringify(packagedNodeModules)};

const Database = require(path.join(root, "better-sqlite3"));
const db = new Database(":memory:");
const row = db.prepare("SELECT 1 AS ok").get();
db.close();
if (row.ok !== 1) throw new Error("better-sqlite3 query probe failed");

const ort = require(path.join(root, "onnxruntime-node"));
if (typeof ort.InferenceSession?.create !== "function") {
  throw new Error("onnxruntime-node probe failed");
}

const keyring = require(path.join(root, "@napi-rs/keyring"));
if (typeof keyring.Entry !== "function") {
  throw new Error("@napi-rs/keyring probe failed");
}

process.stdout.write(JSON.stringify({
  abi: process.versions.modules,
  betterSqlite3: true,
  onnxRuntime: true,
  keyring: true
}));
`;
}

function verifyPackagedNativeModules(appPath = DEFAULT_APP, spawn = spawnSync) {
  const executable = path.join(appPath, "Contents/MacOS/OpenWhispr Custom");
  const packagedNodeModules = path.join(appPath, "Contents/Resources/app.asar/node_modules");

  for (const requiredPath of [
    appPath,
    executable,
    path.join(appPath, "Contents/Resources/app.asar"),
  ]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required package path is missing: ${requiredPath}`);
    }
  }

  const result = spawn(executable, ["-e", buildNativeProbe(packagedNodeModules)], {
    encoding: "utf8",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    timeout: 30_000,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [
        `Packaged native-module probe exited with status ${result.status}.`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  let receipt;
  try {
    receipt = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Packaged native-module probe returned invalid output: ${result.stdout}`);
  }

  for (const key of ["betterSqlite3", "onnxRuntime", "keyring"]) {
    if (receipt[key] !== true) {
      throw new Error(`Packaged native-module probe did not verify ${key}`);
    }
  }

  return receipt;
}

if (require.main === module) {
  const receipt = verifyPackagedNativeModules(process.argv[2] || DEFAULT_APP);
  console.log(`Packaged native modules verified for Electron ABI ${receipt.abi}.`);
}

module.exports = {
  buildNativeProbe,
  verifyPackagedNativeModules,
};
