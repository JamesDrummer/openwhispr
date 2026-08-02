const SHA_PATTERN = /^[0-9a-f]{40}$/;

const INSTALL_RELEVANT_ROOT_FILES = new Set([
  ".nvmrc",
  "electron-builder.json",
  "electron-builder.custom.json",
  "main.js",
  "package-lock.json",
  "package.json",
  "preload.js",
]);

const INSTALL_RELEVANT_SCRIPT_PATTERN =
  /^scripts\/(?:afterPack\.js|build-[^/]+\.js|compile-macos-icon\.js|download-[^/]+\.js|lib\/(?:download-utils|meeting-aec-build)\.js|stamp-custom-build-receipt\.js|verify-custom-macos-package\.js)$/;

function normaliseOptionalSha(value, label) {
  const normalised = String(value || "")
    .trim()
    .toLowerCase();
  if (normalised && !SHA_PATTERN.test(normalised)) {
    throw new Error(`Invalid ${label}: ${normalised}`);
  }
  return normalised;
}

function isInstallRelevantPath(value) {
  const filePath = String(value || "").replace(/^\.\//, "");
  return (
    INSTALL_RELEVANT_ROOT_FILES.has(filePath) ||
    filePath.startsWith("resources/") ||
    filePath.startsWith("src/") ||
    INSTALL_RELEVANT_SCRIPT_PATTERN.test(filePath)
  );
}

function hasInstallRelevantChanges(paths) {
  return Array.from(paths || []).some(isInstallRelevantPath);
}

function classifyCustomInstall({
  installedBase,
  latestBase,
  installedSource,
  latestSource,
  installRelevantSourceChange = true,
}) {
  const currentBase = normaliseOptionalSha(installedBase, "installed upstream base");
  const targetBase = normaliseOptionalSha(latestBase, "latest upstream base");
  const currentSource = normaliseOptionalSha(installedSource, "installed custom source");
  const targetSource = normaliseOptionalSha(latestSource, "latest tested custom source");

  if (!currentBase) return "unknown-installed-build";
  if (!targetBase || currentBase !== targetBase) return "update-available";
  if (
    targetSource &&
    currentSource !== targetSource &&
    installRelevantSourceChange !== false
  ) {
    return "update-available";
  }
  return "up-to-date";
}

module.exports = {
  classifyCustomInstall,
  hasInstallRelevantChanges,
  isInstallRelevantPath,
  normaliseOptionalSha,
};
