const test = require("node:test");
const assert = require("node:assert/strict");

const { getCacheNamespace } = require("../../src/helpers/modelDirUtils.js");
const { getBridgeFilePath } = require("../../src/helpers/cliBridge.js");

test("custom builds use a separate cache namespace", () => {
  const previous = process.env.OPENWHISPR_CHANNEL;
  try {
    process.env.OPENWHISPR_CHANNEL = "custom";
    assert.equal(getCacheNamespace(), "openwhispr-custom");

    process.env.OPENWHISPR_CHANNEL = "production";
    assert.equal(getCacheNamespace(), "openwhispr");
  } finally {
    if (previous === undefined) delete process.env.OPENWHISPR_CHANNEL;
    else process.env.OPENWHISPR_CHANNEL = previous;
  }
});

test("custom builds publish a separate CLI bridge receipt", () => {
  assert.match(getBridgeFilePath("custom"), /\.openwhispr-custom\/cli-bridge\.json$/);
  assert.match(getBridgeFilePath("production"), /\.openwhispr\/cli-bridge\.json$/);
});
