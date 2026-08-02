# OpenWhispr Custom

This branch carries a deliberately small custom feature set on top of stable
OpenWhispr releases.

## Behaviour

- The shared local reasoning server remains loaded for 60 minutes after its
  last use.
- Once microphone capture has started, ordinary dictation begins a best-effort
  warm-up of the selected local cleanup model.
- Warm-up never delays recording, never replaces a different loaded model, and
  does not rewrite settings.
- Different local-model startup requests are serialised so inference cannot be
  sent to the wrong model.

The 60-minute deadline applies to the shared local reasoning server, including
cleanup, agent, chat, and note-formatting use. It can therefore retain RAM or
VRAM for longer than the official build.

## Isolation

The custom package has its own bundle ID, app name, protocol, user-data
directory, cache namespace, CLI bridge receipt, and disabled in-app updater.
The official updater cannot replace this build. Global hotkeys are still
system-wide, so do not run the official and custom apps simultaneously with
the same shortcut.

## Verification

Use Node 24 or later:

```sh
npm run format:check
npm run typecheck
npm run i18n:check
npm test
npm run build:renderer
```

Focused regressions live in:

- `test/helpers/llamaIdlePolicy.test.js`
- `test/helpers/localServerPolicy.test.js`
- `test/helpers/gemmaMtpDrafter.test.js`

## Local macOS package

After the native resources have been prepared:

```sh
npm run pack:custom:mac:arm64
```

This creates an ad-hoc-signed, non-notarised side-by-side candidate under
`dist-custom`. Do not replace the installed official app until dictation, local
cleanup, hotkeys, permissions, and rollback have been checked. Because ad-hoc
signing has no stable Apple team identity, macOS may ask for Accessibility and
microphone approval again after a rebuild.

The packaged `package.json` contains `openwhisprChannel`,
`openwhisprFeatureSet`, and `openwhisprUpstreamBase` as a machine-readable build
receipt. Update the upstream base whenever a stable upstream release is merged.
The maintenance workflow performs that update automatically.

## First-run profile preparation

Preview the source and destination paths:

```sh
npm run custom:prepare-profile
```

After both OpenWhispr applications are fully quit, the explicit apply command is:

```sh
bash scripts/prepare-custom-profile.sh --apply
```

It creates separate copy-on-write clones of the official profile and model
cache. The official data remains the rollback copy. The script refuses to
overwrite a custom profile and removes only stale Chromium `Singleton` files
from the newly-created destination.

## Automated maintenance

`custom/upstream-state.json` records the trusted upstream source commit and the
last observed stable release. `npm run custom:status` checks that this agrees
with the package's embedded build receipt.

Once this branch is the fork's default branch, the custom workflows:

1. check the official latest stable release once per day;
2. reject moved tags, downgrades, and non-descendant release history;
3. merge a new release into an `automation/openwhispr-*` branch;
4. mark changes to model lifecycle, dictation, storage, updater, identity,
   signing, permissions, and CI as requiring review;
5. run formatting, types, i18n, the full test suite, renderer build, and an
   arm64 macOS package;
6. auto-merge only a verified low-risk integration;
7. retain review-classified integrations as assigned draft PRs;
8. create an ad-hoc-signed package as a private draft release and assign a
   notification issue to the repository owner.

No workflow installs or launches the application. Conflicts and security
checks produce assigned issues with bounded repair information suitable for a
Hermes or Codex task.

## Local installed-version monitor

The packaged macOS `Info.plist` carries the same upstream-base receipt as the
packaged JavaScript. This lets a local check compare the installed app with the
fork without launching OpenWhispr:

```sh
npm run custom:check-installed
```

Preview the optional daily macOS notification job:

```sh
npm run custom:monitor-plan
```

Its apply command is deliberately not an npm shortcut:

```sh
bash scripts/install-custom-update-monitor.sh --apply
```

If the monitor is already installed and needs its scripts or runtime paths
refreshed, use the bounded repair mode:

```bash
bash scripts/install-custom-update-monitor.sh --repair
```

Applying creates one user LaunchAgent that checks at login and every 24 hours.
It sends a macOS notification only when an installed custom app is behind the
fork. It also re-enables the scheduled GitHub watcher if GitHub has disabled it
because the public fork was otherwise inactive for 60 days. It never downloads,
installs, launches, or deletes an application. A self-contained copy of the
monitor scripts is placed under `~/Library/Application Support` because macOS
does not permit background LaunchAgents to execute scripts from the protected
Documents folder.
