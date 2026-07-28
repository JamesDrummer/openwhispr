const assert = require("node:assert/strict");
const test = require("node:test");

const {
  classifyCustomInstall,
  normaliseOptionalSha,
} = require("../../scripts/lib/custom-install-status");

const BASE = "a".repeat(40);
const SOURCE = "b".repeat(40);

test("custom install is current only when upstream and tested source receipts match", () => {
  assert.equal(
    classifyCustomInstall({
      installedBase: BASE,
      latestBase: BASE,
      installedSource: SOURCE,
      latestSource: SOURCE,
    }),
    "up-to-date"
  );
});

test("same-upstream custom source changes are reported as updates", () => {
  assert.equal(
    classifyCustomInstall({
      installedBase: BASE,
      latestBase: BASE,
      installedSource: SOURCE,
      latestSource: "c".repeat(40),
    }),
    "update-available"
  );
});

test("an old app without an exact source receipt is offered the tested source-aware build", () => {
  assert.equal(
    classifyCustomInstall({
      installedBase: BASE,
      latestBase: BASE,
      installedSource: "",
      latestSource: SOURCE,
    }),
    "update-available"
  );
});

test("upstream changes and unknown installed builds remain actionable", () => {
  assert.equal(
    classifyCustomInstall({
      installedBase: BASE,
      latestBase: "c".repeat(40),
      installedSource: SOURCE,
      latestSource: SOURCE,
    }),
    "update-available"
  );
  assert.equal(
    classifyCustomInstall({
      installedBase: "",
      latestBase: BASE,
      installedSource: "",
      latestSource: SOURCE,
    }),
    "unknown-installed-build"
  );
});

test("custom install receipts fail closed on malformed SHAs", () => {
  assert.equal(normaliseOptionalSha("", "optional"), "");
  assert.throws(
    () =>
      classifyCustomInstall({
        installedBase: "main",
        latestBase: BASE,
        installedSource: SOURCE,
        latestSource: SOURCE,
      }),
    /Invalid installed upstream base/
  );
});
