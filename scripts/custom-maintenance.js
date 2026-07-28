#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  classifyChangedPaths,
  readProjectState,
  recordRelease,
  validateReleaseTag,
  validateSha,
} = require("./lib/custom-maintenance");

const projectRoot = path.resolve(__dirname, "..");

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function requireOption(name) {
  const value = option(name);
  if (!value) {
    throw new Error(`Missing required option ${name}`);
  }
  return value;
}

function readChangedPaths() {
  const filesPath = requireOption("--files");
  return fs
    .readFileSync(filesPath, "utf8")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function status() {
  const { state } = readProjectState(projectRoot);
  process.stdout.write(`${JSON.stringify(state)}\n`);
}

function classify() {
  const { state } = readProjectState(projectRoot);
  const result = classifyChangedPaths(readChangedPaths(), state.watchedPaths);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function record() {
  const tag = validateReleaseTag(requireOption("--tag"));
  const commitSha = validateSha(requireOption("--sha"));
  const { state } = readProjectState(projectRoot);
  const classification = classifyChangedPaths(readChangedPaths(), state.watchedPaths);
  const report = recordRelease(projectRoot, { tag, commitSha, classification });
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

const command = process.argv[2];

try {
  if (command === "status") {
    status();
  } else if (command === "classify") {
    classify();
  } else if (command === "record") {
    record();
  } else {
    throw new Error("Usage: custom-maintenance.js <status|classify|record> [options]");
  }
} catch (error) {
  process.stderr.write(`Custom maintenance error: ${error.message}\n`);
  process.exitCode = 1;
}
