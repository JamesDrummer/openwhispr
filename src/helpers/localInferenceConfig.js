export function resolveLocalInferenceTemperature(config = {}) {
  return config.temperature ?? (config.systemPrompt ? 0.3 : 0);
}
