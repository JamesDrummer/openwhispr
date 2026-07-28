#!/usr/bin/env bash

set -euo pipefail

notify=false
if [[ "${1:-}" == "--notify" ]]; then
  notify=true
elif [[ -n "${1:-}" ]]; then
  echo "Usage: bash scripts/check-custom-install.sh [--notify]" >&2
  exit 2
fi

repository="${OPENWHISPR_CUSTOM_REPOSITORY:-JamesDrummer/openwhispr}"
branch="${OPENWHISPR_CUSTOM_BRANCH:-custom/model-warmth}"
installed_app="${OPENWHISPR_CUSTOM_APP:-/Applications/OpenWhispr Custom.app}"
state_file="${OPENWHISPR_CUSTOM_STATE_FILE:-}"

if [[ -n "$state_file" ]]; then
  state_json="$(<"$state_file")"
else
  if ! command -v gh >/dev/null; then
    echo "GitHub CLI is required to check the custom build." >&2
    exit 1
  fi
  state_json="$(gh api \
    -H "Accept: application/vnd.github.raw+json" \
    "repos/$repository/contents/custom/upstream-state.json?ref=$branch")"
fi

latest_base="$(printf "%s" "$state_json" | plutil -extract currentBaseSha raw -o - -)"
latest_release="$(printf "%s" "$state_json" | plutil -extract lastObservedStableRelease.tag raw -o - -)"

if [[ ! -d "$installed_app" ]]; then
  echo "status=not-installed"
  echo "latest_release=$latest_release"
  echo "latest_base=$latest_base"
  exit 0
fi

installed_base="$(/usr/libexec/PlistBuddy -c "Print :OpenWhisprUpstreamBase" \
  "$installed_app/Contents/Info.plist" 2>/dev/null || true)"
installed_version="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" \
  "$installed_app/Contents/Info.plist" 2>/dev/null || true)"

if [[ -z "$installed_base" ]]; then
  status="unknown-installed-build"
elif [[ "$installed_base" == "$latest_base" ]]; then
  status="up-to-date"
else
  status="update-available"
fi

echo "status=$status"
echo "installed_version=${installed_version:-unknown}"
echo "installed_base=${installed_base:-unknown}"
echo "latest_release=$latest_release"
echo "latest_base=$latest_base"

if [[ "$notify" == true && "$status" != "up-to-date" ]]; then
  osascript -e "display notification \"A tested custom build based on $latest_release is available on GitHub.\" with title \"OpenWhispr Custom update\""
fi
