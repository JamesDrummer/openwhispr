const SHA_PATTERN = /^[0-9a-f]{40}$/;

function normaliseOptionalSha(value, label) {
  const normalised = String(value || "")
    .trim()
    .toLowerCase();
  if (normalised && !SHA_PATTERN.test(normalised)) {
    throw new Error(`Invalid ${label}: ${normalised}`);
  }
  return normalised;
}

function classifyCustomInstall({ installedBase, latestBase, installedSource, latestSource }) {
  const currentBase = normaliseOptionalSha(installedBase, "installed upstream base");
  const targetBase = normaliseOptionalSha(latestBase, "latest upstream base");
  const currentSource = normaliseOptionalSha(installedSource, "installed custom source");
  const targetSource = normaliseOptionalSha(latestSource, "latest tested custom source");

  if (!currentBase) return "unknown-installed-build";
  if (!targetBase || currentBase !== targetBase) return "update-available";
  if (targetSource && currentSource !== targetSource) return "update-available";
  return "up-to-date";
}

module.exports = {
  classifyCustomInstall,
  normaliseOptionalSha,
};
