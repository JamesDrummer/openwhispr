const { app } = require("electron");
const os = require("os");
const path = require("path");

function getCacheNamespace() {
  return process.env.OPENWHISPR_CHANNEL === "custom" ? "openwhispr-custom" : "openwhispr";
}

function getCacheRoot() {
  const homeDir = app?.getPath?.("home") || os.homedir();
  return path.join(homeDir, ".cache", getCacheNamespace());
}

function getModelsDirForService(service) {
  return path.join(getCacheRoot(), `${service}-models`);
}

module.exports = { getCacheNamespace, getCacheRoot, getModelsDirForService };
