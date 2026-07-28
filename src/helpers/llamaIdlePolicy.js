// Custom-build policy: keep the local cleanup LLM warm between normal
// dictation bursts while still releasing its memory after a long idle period.
const LOCAL_LLM_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

module.exports = { LOCAL_LLM_IDLE_TIMEOUT_MS };
