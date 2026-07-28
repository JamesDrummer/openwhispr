const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveCustomSourceSha,
  stampCustomBuildReceipt,
} = require("../../scripts/stamp-custom-build-receipt");

test("custom package receipt prefers an explicitly supplied immutable source SHA", () => {
  const explicit = "a".repeat(40);
  const source = resolveCustomSourceSha({
    env: {
      OPENWHISPR_CUSTOM_SOURCE_SHA: explicit,
      GITHUB_SHA: "b".repeat(40),
    },
    execFileSyncImpl: () => {
      throw new Error("git fallback should not run");
    },
  });

  assert.equal(source, explicit);
});

test("custom package receipt falls back to the checked-out Git commit", () => {
  const source = resolveCustomSourceSha({
    env: {},
    execFileSyncImpl(command, args, options) {
      assert.equal(command, "git");
      assert.deepEqual(args, ["rev-parse", "HEAD"]);
      assert.equal(options.encoding, "utf8");
      return `${"c".repeat(40)}\n`;
    },
  });

  assert.equal(source, "c".repeat(40));
});

test("custom package receipt rejects a mutable ref or malformed source", () => {
  assert.throws(
    () =>
      resolveCustomSourceSha({
        env: { OPENWHISPR_CUSTOM_SOURCE_SHA: "main" },
      }),
    /Invalid custom build source SHA/
  );
});

test("custom package receipt stamps package metadata and the macOS Info.plist", () => {
  const context = {
    packager: {
      config: {
        extraMetadata: { openwhisprChannel: "custom" },
      },
      platformSpecificBuildOptions: {
        extendInfo: { OpenWhisprChannel: "custom" },
      },
    },
  };

  const source = stampCustomBuildReceipt(context, {
    env: { OPENWHISPR_CUSTOM_SOURCE_SHA: "d".repeat(40) },
  });

  assert.equal(source, "d".repeat(40));
  assert.equal(context.packager.config.extraMetadata.openwhisprCustomSource, source);
  assert.equal(
    context.packager.platformSpecificBuildOptions.extendInfo.OpenWhisprCustomSource,
    source
  );
});
