const test = require("node:test");
const assert = require("node:assert/strict");

test("local cleanup requests use zero temperature", async () => {
  const loaded = await import("../../src/helpers/localInferenceConfig.js");
  const { resolveLocalInferenceTemperature } = loaded.default ?? loaded;
  assert.equal(resolveLocalInferenceTemperature({}), 0);
});

test("an explicit zero temperature is preserved", async () => {
  const loaded = await import("../../src/helpers/localInferenceConfig.js");
  const { resolveLocalInferenceTemperature } = loaded.default ?? loaded;
  assert.equal(resolveLocalInferenceTemperature({ temperature: 0 }), 0);
});

test("custom-prompt requests retain their modest creative default", async () => {
  const loaded = await import("../../src/helpers/localInferenceConfig.js");
  const { resolveLocalInferenceTemperature } = loaded.default ?? loaded;
  assert.equal(resolveLocalInferenceTemperature({ systemPrompt: "Follow this instruction." }), 0.3);
});
