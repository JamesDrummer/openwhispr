const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  classifyChangedPaths,
  pathIsWatched,
  readProjectState,
  recordRelease,
  validateReleaseTag,
  validateSha,
} = require("../../scripts/lib/custom-maintenance");

test("custom maintenance validates immutable SHAs and safe release tags", () => {
  assert.equal(validateSha("a".repeat(40)), "a".repeat(40));
  assert.equal(validateReleaseTag("v1.8.0"), "v1.8.0");
  assert.throws(() => validateSha("main"), /Invalid commit SHA/);
  assert.throws(() => validateReleaseTag("../main"), /Invalid stable release tag/);
});

test("watched prefixes and exact files are classified for review", () => {
  const watched = ["src/helpers/llamaServer.js", "src/stores/", "electron-builder"];
  assert.equal(pathIsWatched("src/helpers/llamaServer.js", watched), true);
  assert.equal(pathIsWatched("src/stores/settings.ts", watched), true);
  assert.equal(pathIsWatched("electron-builder.json", watched), true);
  assert.equal(pathIsWatched("src/components/About.tsx", watched), false);

  assert.deepEqual(
    classifyChangedPaths(["src/components/About.tsx", "src/helpers/llamaServer.js"], watched),
    {
      risk: "review",
      changedPaths: ["src/components/About.tsx", "src/helpers/llamaServer.js"],
      watchedChanges: ["src/helpers/llamaServer.js"],
    }
  );
  assert.equal(classifyChangedPaths(["README.md"], watched).risk, "low");
});

test("recording a release keeps maintenance state and package receipt aligned", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openwhispr-maintenance-"));
  fs.mkdirSync(path.join(root, "custom"));
  fs.writeFileSync(
    path.join(root, "custom", "upstream-state.json"),
    JSON.stringify({
      schemaVersion: 1,
      upstreamRepository: "OpenWhispr/openwhispr",
      currentBaseSha: "a".repeat(40),
      lastObservedStableRelease: { tag: "v1.0.0", commitSha: "b".repeat(40) },
      watchedPaths: ["main.js"],
    })
  );
  fs.writeFileSync(
    path.join(root, "electron-builder.custom.json"),
    JSON.stringify({
      extraMetadata: { openwhisprUpstreamBase: "a".repeat(40) },
      mac: { extendInfo: { OpenWhisprUpstreamBase: "a".repeat(40) } },
    })
  );

  const report = recordRelease(root, {
    tag: "v1.1.0",
    commitSha: "c".repeat(40),
    classification: {
      risk: "review",
      changedPaths: ["main.js"],
      watchedChanges: ["main.js"],
    },
  });

  const { state, builder } = readProjectState(root);
  assert.equal(state.currentBaseSha, "c".repeat(40));
  assert.equal(state.lastObservedStableRelease.tag, "v1.1.0");
  assert.equal(builder.extraMetadata.openwhisprUpstreamBase, "c".repeat(40));
  assert.equal(builder.mac.extendInfo.OpenWhisprUpstreamBase, "c".repeat(40));
  assert.deepEqual(report.watchedChanges, ["main.js"]);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, "custom", "integration-report.json"))).risk,
    "review"
  );
});
