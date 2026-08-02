const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (filePath) => fs.readFileSync(path.join(root, filePath), "utf8");

test("PR packaging explicitly enables secret-free ad-hoc signing", () => {
  const workflow = read(".github/workflows/custom-verify.yml");
  assert.match(workflow, /CSC_FOR_PULL_REQUEST: true/);
  assert.match(workflow, /identity \(`-`\), not signing secrets/);
});

test("maintenance-only custom branch pushes do not package a replacement app", () => {
  const workflow = read(".github/workflows/custom-package.yml");
  assert.match(workflow, /paths:\n(?:.|\n)*- "src\/\*\*"/);
  assert.doesNotMatch(workflow, /- "\.github\/\*\*"/);
  assert.doesNotMatch(workflow, /- "scripts\/check-custom-install\.sh"/);
});

test("the installed monitor PATH includes both Node and GitHub CLI", () => {
  const installer = read("scripts/install-custom-update-monitor.sh");
  assert.match(installer, /node_path="\$\(command -v node\)"/);
  assert.match(
    installer,
    /\$\(dirname "\$node_path"\):\$\(dirname "\$gh_path"\):\/usr\/bin/
  );
  assert.match(installer, /--repair/);
});
