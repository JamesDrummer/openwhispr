const { execFileSync } = require("node:child_process");

const SHA_PATTERN = /^[0-9a-f]{40}$/;

function resolveCustomSourceSha({
  env = process.env,
  cwd = process.cwd(),
  execFileSyncImpl = execFileSync,
} = {}) {
  const source = (
    env.OPENWHISPR_CUSTOM_SOURCE_SHA ||
    env.GITHUB_SHA ||
    execFileSyncImpl("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" })
  )
    .trim()
    .toLowerCase();

  if (!SHA_PATTERN.test(source)) {
    throw new Error(`Invalid custom build source SHA: ${source || "(missing)"}`);
  }
  return source;
}

function stampCustomBuildReceipt(context, options = {}) {
  const source = resolveCustomSourceSha(options);
  const config = context?.packager?.config;
  const macOptions = context?.packager?.platformSpecificBuildOptions;
  if (!config || !macOptions) {
    throw new Error("Custom build receipt hook did not receive a macOS packager context");
  }

  config.extraMetadata = {
    ...(config.extraMetadata || {}),
    openwhisprCustomSource: source,
  };
  macOptions.extendInfo = {
    ...(macOptions.extendInfo || {}),
    OpenWhisprCustomSource: source,
  };

  console.log(`Stamped OpenWhispr Custom source receipt ${source}`);
  return source;
}

module.exports = stampCustomBuildReceipt;
module.exports.resolveCustomSourceSha = resolveCustomSourceSha;
module.exports.stampCustomBuildReceipt = stampCustomBuildReceipt;
