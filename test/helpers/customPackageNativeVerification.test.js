const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildNativeProbe,
  verifyPackagedNativeModules,
} = require("../../scripts/verify-custom-macos-package");

function makePackageSkeleton() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openwhispr-custom-package-"));
  const appPath = path.join(root, "OpenWhispr Custom.app");

  fs.mkdirSync(path.join(appPath, "Contents/MacOS"), { recursive: true });
  fs.mkdirSync(path.join(appPath, "Contents/Resources"), { recursive: true });
  fs.writeFileSync(path.join(appPath, "Contents/MacOS/OpenWhispr Custom"), "");
  fs.writeFileSync(path.join(appPath, "Contents/Resources/app.asar"), "");

  return { appPath, root };
}

test("native probe exercises every packaged native dependency needed at startup", () => {
  const probe = buildNativeProbe("/package/app.asar/node_modules");

  assert.match(probe, /better-sqlite3/);
  assert.match(probe, /SELECT 1 AS ok/);
  assert.match(probe, /onnxruntime-node/);
  assert.match(probe, /@napi-rs\/keyring/);
});

test("packaged native verification uses the packaged Electron runtime", (t) => {
  const { appPath, root } = makePackageSkeleton();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  let invocation;
  const receipt = verifyPackagedNativeModules(appPath, (...args) => {
    invocation = args;
    return {
      status: 0,
      stdout: JSON.stringify({
        abi: "145",
        betterSqlite3: true,
        onnxRuntime: true,
        keyring: true,
      }),
      stderr: "",
    };
  });

  assert.equal(receipt.abi, "145");
  assert.equal(invocation[0], path.join(appPath, "Contents/MacOS/OpenWhispr Custom"));
  assert.equal(invocation[2].env.ELECTRON_RUN_AS_NODE, "1");
});

test("packaged native verification fails closed on an ABI error", (t) => {
  const { appPath, root } = makePackageSkeleton();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.throws(
    () =>
      verifyPackagedNativeModules(appPath, () => ({
        status: 1,
        stdout: "",
        stderr: "NODE_MODULE_VERSION 137; requires NODE_MODULE_VERSION 145",
      })),
    /NODE_MODULE_VERSION 137/
  );
});
