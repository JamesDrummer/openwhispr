// Which model each LLM scope needs pre-warmed in the shared llama-server, and
// whether that server can be stopped.
//
// A scope stores its local selection as a catalog family id (qwen, gemma, …),
// never the literal "local", so only the scope's mode says whether it runs
// locally. A scope that is switched off never runs, so it needs no server.
export function resolveLocalServerNeeds({
  useCleanupModel,
  cleanupMode,
  cleanupModel,
  useDictationAgent,
  dictationAgentMode,
  dictationAgentModel,
}) {
  const cleanup = useCleanupModel && cleanupMode === "local" ? cleanupModel?.trim() || "" : "";
  const dictationAgent =
    useDictationAgent && dictationAgentMode === "local" ? dictationAgentModel?.trim() || "" : "";

  return { cleanup, dictationAgent, stopServer: !cleanup && !dictationAgent };
}

// Ordinary dictation can predict its cleanup model before audio is transcribed,
// allowing model loading to overlap speech capture. Explicit voice-agent and
// translation routes may use another model in the shared llama-server, so they
// deliberately skip this cleanup-specific warm-up.
export function resolveDictationPrewarmModel(
  { useCleanupModel, cleanupMode, cleanupModel },
  { voiceAgentRequested = false, translationRequested = false } = {}
) {
  if (voiceAgentRequested || translationRequested) return "";
  if (!useCleanupModel || cleanupMode !== "local") return "";
  return cleanupModel?.trim() || "";
}

// Start a best-effort warm-up without putting model availability on the
// recording path. This deliberately returns before the bridge promise settles
// and contains both synchronous bridge errors and asynchronous failures.
export function beginDictationPrewarm(settings, route, prewarm, onFailure = () => {}) {
  const model = resolveDictationPrewarmModel(settings, route);
  if (!model || typeof prewarm !== "function") return "";

  try {
    void Promise.resolve(prewarm(model))
      .then((result) => {
        if (!result?.success) {
          onFailure(result?.error, model);
        }
      })
      .catch((error) => onFailure(error, model));
  } catch (error) {
    onFailure(error, model);
  }

  return model;
}
