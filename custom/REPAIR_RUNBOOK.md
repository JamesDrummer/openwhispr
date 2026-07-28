# OpenWhispr Custom repair runbook

This is the hand-off contract for a `[custom repair]` issue created by the
maintenance workflows. James remains the decision-maker; Hermes or a Codex task
can perform the bounded repair work described here.

## Behaviour that must not regress

- The shared local cleanup model has a 60-minute idle timeout.
- Ordinary dictation starts a best-effort, non-blocking cleanup-model warm-up
  only after microphone capture has started.
- Warm-up must not delay or prevent recording.
- Voice-agent and translation flows keep their existing behaviour.
- Other active users of the shared model must not be interrupted.
- The custom app keeps its separate application identity, URL protocol, profile,
  cache and disabled automatic updater.
- Automation must never install an app or modify the official OpenWhispr app.

## Bounded repair procedure

1. Open the assigned `[custom repair]` issue and its linked workflow run. Record
   the failing job and first relevant error.
2. When working on James's Mac, read
   `/Users/admin/Documents/Codex/2026-07-21/so/OPENWHISPR_CUSTOM_PLAN.md` for the
   current installation, verification and rollback state.
3. Compare upstream changes with the watched files in
   `custom/integration-report.json`. Treat changes to model lifecycle,
   transcription, application identity, storage, packaging or updates as
   review-required.
4. Work on a separate repair branch or worktree. Do not change the installed
   application while diagnosing CI.
5. Use the Node version in `.nvmrc`, then run:

   ```text
   npm ci
   npm run format:check
   npm run typecheck
   npm run i18n:check
   npm test
   npm run build:renderer
   npm run build:custom:mac:arm64
   npm run verify:custom:mac:arm64
   ```

6. Put the cause, repair and verification evidence in a pull request. Only a
   mechanical, low-risk upstream integration may auto-merge. If behaviour or
   product intent is ambiguous, leave the pull request draft and ask James.
7. Close the repair issue only after the repaired workflow is green. Package
   installation remains a separate, manual decision.

## Rollback and recovery

- `/Applications/OpenWhispr.app` is the retained official application.
- The custom profile and model cache are separate from the official app.
- Draft custom releases are retained as build receipts. A release explicitly
  labelled `BROKEN` must not be installed; a retained `SUPERSEDED` release may
  be used as a known-good rollback when its notes identify it as such.
- If a newly installed custom build fails, quit it and restore the previous
  custom application bundle. Do not delete or migrate either profile as part of
  an automated repair.

## Hermes hand-off

Hermes can monitor open issues assigned to James whose titles begin
`[custom repair]` and start a Codex repair task containing the issue and run
links. Direct Hermes transport is optional and is not configured by this
repository; GitHub issues are the durable exception queue.
