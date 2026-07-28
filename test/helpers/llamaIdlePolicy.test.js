const test = require("node:test");
const assert = require("node:assert/strict");

const { LOCAL_LLM_IDLE_TIMEOUT_MS } = require("../../src/helpers/llamaIdlePolicy");

test("custom local LLM idle timeout is 60 minutes", () => {
  assert.equal(LOCAL_LLM_IDLE_TIMEOUT_MS, 60 * 60 * 1000);
});
