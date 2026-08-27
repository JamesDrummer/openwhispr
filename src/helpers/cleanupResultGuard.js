function compactLength(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().length : 0;
}

function wordCount(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.split(/\s+/).length : 0;
}

/**
 * Cleanup may remove filler and false starts, but it should never collapse a
 * substantial dictation into a fragment. Keep this deliberately conservative:
 * it catches catastrophic truncation, not normal editing.
 */
export function isSuspiciouslyTruncatedCleanup(rawText, cleanedText) {
  const rawLength = compactLength(rawText);
  const cleanedLength = compactLength(cleanedText);
  const rawWords = wordCount(rawText);
  const cleanedWords = wordCount(cleanedText);

  if (rawLength < 80 || rawWords < 12) return false;
  if (cleanedLength === 0) return true;

  return cleanedLength < rawLength * 0.5 && cleanedWords < rawWords * 0.55;
}
