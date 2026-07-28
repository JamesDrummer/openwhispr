const fs = require("fs");
const path = require("path");

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const RELEASE_TAG_PATTERN = /^v?[0-9][0-9A-Za-z._-]*$/;

function validateSha(value, label = "commit SHA") {
  if (!SHA_PATTERN.test(value || "")) {
    throw new Error(`Invalid ${label}: ${value || "(missing)"}`);
  }
  return value;
}

function validateReleaseTag(value) {
  if (!RELEASE_TAG_PATTERN.test(value || "")) {
    throw new Error(`Invalid stable release tag: ${value || "(missing)"}`);
  }
  return value;
}

function validateState(state) {
  if (state?.schemaVersion !== 1) {
    throw new Error(`Unsupported custom maintenance state version: ${state?.schemaVersion}`);
  }
  if (typeof state.upstreamRepository !== "string" || !state.upstreamRepository.includes("/")) {
    throw new Error("Custom maintenance state has no valid upstream repository");
  }
  validateSha(state.currentBaseSha, "current upstream base SHA");
  validateReleaseTag(state.lastObservedStableRelease?.tag);
  validateSha(state.lastObservedStableRelease?.commitSha, "stable release SHA");
  if (
    !Array.isArray(state.watchedPaths) ||
    state.watchedPaths.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    throw new Error("Custom maintenance state has invalid watched paths");
  }
  return state;
}

function pathIsWatched(filePath, watchedPaths) {
  return watchedPaths.some((watchedPath) => {
    if (watchedPath.endsWith("/")) {
      return filePath.startsWith(watchedPath);
    }
    return filePath === watchedPath || filePath.startsWith(`${watchedPath}.`);
  });
}

function classifyChangedPaths(changedPaths, watchedPaths) {
  const uniquePaths = [...new Set(changedPaths.filter(Boolean))].sort();
  const watchedChanges = uniquePaths.filter((filePath) => pathIsWatched(filePath, watchedPaths));
  return {
    risk: watchedChanges.length === 0 ? "low" : "review",
    changedPaths: uniquePaths,
    watchedChanges,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readProjectState(projectRoot) {
  const statePath = path.join(projectRoot, "custom", "upstream-state.json");
  const builderPath = path.join(projectRoot, "electron-builder.custom.json");
  const state = validateState(readJson(statePath));
  const builder = readJson(builderPath);
  const packagedBase = builder?.extraMetadata?.openwhisprUpstreamBase;
  if (packagedBase !== state.currentBaseSha) {
    throw new Error(
      `Build receipt base ${packagedBase || "(missing)"} does not match maintenance state ${state.currentBaseSha}`
    );
  }
  const plistBase = builder?.mac?.extendInfo?.OpenWhisprUpstreamBase;
  if (plistBase !== state.currentBaseSha) {
    throw new Error(
      `Info.plist receipt base ${plistBase || "(missing)"} does not match maintenance state ${state.currentBaseSha}`
    );
  }
  return { statePath, builderPath, state, builder };
}

function recordRelease(projectRoot, { tag, commitSha, classification }) {
  validateReleaseTag(tag);
  validateSha(commitSha);
  const project = readProjectState(projectRoot);
  const report = {
    schemaVersion: 1,
    upstreamRelease: tag,
    upstreamCommitSha: commitSha,
    risk: classification.risk,
    watchedChanges: classification.watchedChanges,
    changedPaths: classification.changedPaths,
  };

  project.state.currentBaseSha = commitSha;
  project.state.lastObservedStableRelease = { tag, commitSha };
  project.builder.extraMetadata.openwhisprUpstreamBase = commitSha;
  project.builder.mac.extendInfo.OpenWhisprUpstreamBase = commitSha;

  writeJson(project.statePath, project.state);
  writeJson(project.builderPath, project.builder);
  writeJson(path.join(projectRoot, "custom", "integration-report.json"), report);
  return report;
}

module.exports = {
  classifyChangedPaths,
  pathIsWatched,
  readProjectState,
  recordRelease,
  validateReleaseTag,
  validateSha,
  validateState,
};
