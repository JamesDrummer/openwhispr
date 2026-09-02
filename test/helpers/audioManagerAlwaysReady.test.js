const test = require("node:test");
const assert = require("node:assert/strict");
const { loadAudioManager } = require("./harness/audioManager");
const { installMicCaptureGlobals } = require("../lib/rendererTestHarness");

test("Always Ready opens and retains an idle microphone stream", async (t) => {
  installMicCaptureGlobals(t);
  const { AudioManager } = await loadAudioManager(t, {
    cachePrefix: "openwhispr-always-ready-test-",
    settingsKey: "__alwaysReadySettings",
    settings: {},
  });
  const track = { stopped: 0, stop() { this.stopped += 1; } };
  const stream = { getTracks: () => [track] };
  const adopted = [];
  let acquisitions = 0;
  globalThis.navigator.mediaDevices.getUserMedia = async () => {
    acquisitions += 1;
    return stream;
  };

  const manager = Object.assign(Object.create(AudioManager.prototype), {
    _micHoldSeconds: -1,
    _alwaysReadyGeneration: 0,
    _alwaysReadyPromise: null,
    _startInProgress: false,
    isRecording: false,
    isStreaming: false,
    preparedMicCapture: { active: false },
    micStreamHold: {
      active: false,
      adopt: (value, key) => {
        adopted.push({ value, key });
        manager.micStreamHold.active = true;
      },
    },
    getAudioConstraints: async () => ({ audio: { deviceId: { exact: "mic-1" } } }),
    acquireHealthyMicStream: async (value) => value,
    _stampMicWarm: () => {},
  });

  assert.equal(await manager.ensureMicAlwaysReady(), true);
  assert.equal(acquisitions, 1);
  assert.deepEqual(adopted, [
    { value: stream, key: JSON.stringify({ deviceId: { exact: "mic-1" } }) },
  ]);
  assert.equal(track.stopped, 0);
  assert.equal(await manager.ensureMicAlwaysReady(), false);
  assert.equal(acquisitions, 1);
});

test("Always Ready never opens the microphone unless explicitly selected", async (t) => {
  installMicCaptureGlobals(t);
  const { AudioManager } = await loadAudioManager(t, {
    cachePrefix: "openwhispr-always-ready-disabled-test-",
    settingsKey: "__alwaysReadyDisabledSettings",
    settings: {},
  });
  let acquisitions = 0;
  globalThis.navigator.mediaDevices.getUserMedia = async () => {
    acquisitions += 1;
    return { getTracks: () => [] };
  };
  const manager = Object.assign(Object.create(AudioManager.prototype), {
    _micHoldSeconds: 60,
    micStreamHold: { active: false },
  });

  assert.equal(await manager.ensureMicAlwaysReady(), false);
  assert.equal(acquisitions, 0);
});
