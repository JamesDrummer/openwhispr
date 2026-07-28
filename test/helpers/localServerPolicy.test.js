const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/helpers/localServerPolicy.js");

const LOCAL_CLEANUP = {
  useCleanupModel: true,
  cleanupMode: "local",
  cleanupModel: "qwen3-8b-q4_k_m",
  useDictationAgent: false,
  dictationAgentMode: "openwhispr",
  dictationAgentModel: "",
};

test("a local scope pre-warms the model it selected", async () => {
  const { resolveLocalServerNeeds } = await load();

  assert.deepEqual(resolveLocalServerNeeds(LOCAL_CLEANUP), {
    cleanup: "qwen3-8b-q4_k_m",
    dictationAgent: "",
    stopServer: false,
  });
});

test("a local selection is recognized by its mode, not its provider id", async () => {
  const { resolveLocalServerNeeds } = await load();

  // Regression guard: scopes store the catalog family id (qwen, gemma, …) as
  // their provider, never the literal "local". Keying off the provider left
  // pre-warming permanently off and stopped the server for active local users.
  const needs = resolveLocalServerNeeds({ ...LOCAL_CLEANUP, cleanupProvider: "qwen" });

  assert.equal(needs.cleanup, "qwen3-8b-q4_k_m");
  assert.equal(needs.stopServer, false);
});

test("a switched-off scope needs no server even with a local model selected", async () => {
  const { resolveLocalServerNeeds } = await load();

  assert.deepEqual(resolveLocalServerNeeds({ ...LOCAL_CLEANUP, useCleanupModel: false }), {
    cleanup: "",
    dictationAgent: "",
    stopServer: true,
  });
});

test("local mode without a downloaded model pre-warms nothing", async () => {
  const { resolveLocalServerNeeds } = await load();

  const needs = resolveLocalServerNeeds({ ...LOCAL_CLEANUP, cleanupModel: "  " });

  assert.equal(needs.cleanup, "");
  assert.equal(needs.stopServer, true);
});

test("the shared server survives one scope leaving while the other stays local", async () => {
  const { resolveLocalServerNeeds } = await load();

  const needs = resolveLocalServerNeeds({
    useCleanupModel: true,
    cleanupMode: "providers",
    cleanupModel: "gpt-5-mini",
    useDictationAgent: true,
    dictationAgentMode: "local",
    dictationAgentModel: "gemma-4-e4b-it-q4_k_m",
  });

  assert.deepEqual(needs, {
    cleanup: "",
    dictationAgent: "gemma-4-e4b-it-q4_k_m",
    stopServer: false,
  });
});

test("the server stops once no scope runs locally", async () => {
  const { resolveLocalServerNeeds } = await load();

  for (const mode of ["openwhispr", "providers", "self-hosted", "enterprise"]) {
    const needs = resolveLocalServerNeeds({
      useCleanupModel: true,
      cleanupMode: mode,
      cleanupModel: "gpt-5-mini",
      useDictationAgent: true,
      dictationAgentMode: mode,
      dictationAgentModel: "gpt-5-mini",
    });

    assert.deepEqual(needs, { cleanup: "", dictationAgent: "", stopServer: true }, mode);
  }
});

test("ordinary dictation pre-warms its enabled local cleanup model", async () => {
  const { resolveDictationPrewarmModel } = await load();

  assert.equal(resolveDictationPrewarmModel(LOCAL_CLEANUP), "qwen3-8b-q4_k_m");
});

test("dictation pre-warm uses local mode rather than the catalog provider id", async () => {
  const { resolveDictationPrewarmModel } = await load();

  assert.equal(
    resolveDictationPrewarmModel({ ...LOCAL_CLEANUP, cleanupProvider: "qwen" }),
    "qwen3-8b-q4_k_m"
  );
});

test("dictation pre-warm skips disabled, non-local, and missing cleanup models", async () => {
  const { resolveDictationPrewarmModel } = await load();

  assert.equal(
    resolveDictationPrewarmModel({ ...LOCAL_CLEANUP, useCleanupModel: false }),
    ""
  );
  assert.equal(
    resolveDictationPrewarmModel({ ...LOCAL_CLEANUP, cleanupMode: "providers" }),
    ""
  );
  assert.equal(resolveDictationPrewarmModel({ ...LOCAL_CLEANUP, cleanupModel: "  " }), "");
});

test("dictation pre-warm leaves voice-agent and translation model routing alone", async () => {
  const { resolveDictationPrewarmModel } = await load();

  assert.equal(resolveDictationPrewarmModel(LOCAL_CLEANUP, { voiceAgentRequested: true }), "");
  assert.equal(resolveDictationPrewarmModel(LOCAL_CLEANUP, { translationRequested: true }), "");
});

test("dictation pre-warm returns immediately while model startup is pending", async () => {
  const { beginDictationPrewarm } = await load();
  let settle;
  const pending = new Promise((resolve) => {
    settle = resolve;
  });
  const calls = [];

  const model = beginDictationPrewarm(
    LOCAL_CLEANUP,
    {},
    (modelId) => {
      calls.push(modelId);
      return pending;
    }
  );

  assert.equal(model, "qwen3-8b-q4_k_m");
  assert.deepEqual(calls, ["qwen3-8b-q4_k_m"]);
  settle({ success: true });
  await pending;
});

test("dictation pre-warm contains synchronous and asynchronous bridge failures", async () => {
  const { beginDictationPrewarm } = await load();
  const failures = [];

  assert.doesNotThrow(() =>
    beginDictationPrewarm(
      LOCAL_CLEANUP,
      {},
      () => {
        throw new Error("synchronous bridge failure");
      },
      (error, model) => failures.push({ message: error.message, model })
    )
  );

  beginDictationPrewarm(
    LOCAL_CLEANUP,
    {},
    () => Promise.reject(new Error("asynchronous bridge failure")),
    (error, model) => failures.push({ message: error.message, model })
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(failures, [
    { message: "synchronous bridge failure", model: "qwen3-8b-q4_k_m" },
    { message: "asynchronous bridge failure", model: "qwen3-8b-q4_k_m" },
  ]);
});

test("dictation pre-warm reports an unsuccessful result without throwing", async () => {
  const { beginDictationPrewarm } = await load();
  const failures = [];

  beginDictationPrewarm(
    LOCAL_CLEANUP,
    {},
    async () => ({ success: false, error: "model missing" }),
    (error, model) => failures.push({ error, model })
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(failures, [
    { error: "model missing", model: "qwen3-8b-q4_k_m" },
  ]);
});
