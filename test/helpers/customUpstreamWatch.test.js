const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflowPath = path.join(
  __dirname,
  "..",
  "..",
  ".github",
  "workflows",
  "custom-upstream-watch.yml"
);

test("an expected upstream merge conflict creates one hand-off without failing the watcher", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const conflictHandler = workflow.match(
    /if ! git merge --no-commit --no-ff "\$TARGET_SHA"; then([\s\S]*?)\n {10}fi/
  );

  assert.ok(conflictHandler, "merge-conflict handler should remain present");
  assert.match(conflictHandler[1], /gh issue list --state open/);
  assert.match(conflictHandler[1], /if \[\[ -z "\$existing" \]\]; then/);
  assert.match(conflictHandler[1], /echo "handled_conflict=true" >> "\$GITHUB_OUTPUT"/);
  assert.match(conflictHandler[1], /exit 0/);
  assert.doesNotMatch(conflictHandler[1], /exit 1/);
});
