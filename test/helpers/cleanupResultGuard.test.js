const test = require("node:test");
const assert = require("node:assert/strict");

test("flags a substantial transcript collapsed into a fragment", async () => {
  const loaded = await import("../../src/helpers/cleanupResultGuard.js");
  const { isSuspiciouslyTruncatedCleanup } = loaded.default ?? loaded;
  const raw =
    "This is a longer dictated message with several important points that must all remain in the final cleaned transcription for the recipient to understand properly.";
  assert.equal(isSuspiciouslyTruncatedCleanup(raw, "Several important points."), true);
});

test("allows normal filler removal and light editing", async () => {
  const loaded = await import("../../src/helpers/cleanupResultGuard.js");
  const { isSuspiciouslyTruncatedCleanup } = loaded.default ?? loaded;
  const raw =
    "Um, this is a longer dictated message, and I think it contains several important points that should remain in the final cleaned transcription for the recipient.";
  const cleaned =
    "This is a longer dictated message containing several important points that should remain in the final cleaned transcription for the recipient.";
  assert.equal(isSuspiciouslyTruncatedCleanup(raw, cleaned), false);
});

test("does not second-guess short dictations", async () => {
  const loaded = await import("../../src/helpers/cleanupResultGuard.js");
  const { isSuspiciouslyTruncatedCleanup } = loaded.default ?? loaded;
  assert.equal(
    isSuspiciouslyTruncatedCleanup("Erm, yes, that sounds good to me.", "Yes, sounds good."),
    false
  );
});
