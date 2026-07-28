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
latest_source="${OPENWHISPR_CUSTOM_LATEST_SOURCE:-}"
latest_build_url="${OPENWHISPR_CUSTOM_LATEST_BUILD_URL:-}"
installed_source_file="${OPENWHISPR_CUSTOM_INSTALLED_SOURCE_FILE:-$HOME/Library/Application Support/OpenWhispr Custom Maintenance/installed-source-sha}"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

if [[ -z "$latest_source" ]]; then
  if ! command -v gh >/dev/null; then
    echo "GitHub CLI is required to find the latest tested custom package." >&2
    exit 1
  fi
  package_run="$(gh run list \
    --repo "$repository" \
    --workflow custom-package.yml \
    --branch "$branch" \
    --status success \
    --limit 1 \
    --json headSha,url \
    --jq '.[0] // {}')"
  latest_source="$(printf "%s" "$package_run" | plutil -extract headSha raw -o - - 2>/dev/null || true)"
  latest_build_url="$(printf "%s" "$package_run" | plutil -extract url raw -o - - 2>/dev/null || true)"
fi

if [[ ! -d "$installed_app" ]]; then
  echo "status=not-installed"
  echo "latest_release=$latest_release"
  echo "latest_base=$latest_base"
  echo "latest_source=${latest_source:-unknown}"
  echo "latest_build_url=${latest_build_url:-unknown}"
  exit 0
fi

installed_base="$(/usr/libexec/PlistBuddy -c "Print :OpenWhisprUpstreamBase" \
  "$installed_app/Contents/Info.plist" 2>/dev/null || true)"
installed_source="$(/usr/libexec/PlistBuddy -c "Print :OpenWhisprCustomSource" \
  "$installed_app/Contents/Info.plist" 2>/dev/null || true)"
installed_version="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" \
  "$installed_app/Contents/Info.plist" 2>/dev/null || true)"

if [[ -z "$installed_source" && -f "$installed_source_file" ]]; then
  installed_source="$(tr -d '[:space:]' <"$installed_source_file")"
fi

status="$(node -e '
  const { classifyCustomInstall } = require(process.argv[1]);
  process.stdout.write(classifyCustomInstall({
    installedBase: process.argv[2],
    latestBase: process.argv[3],
    installedSource: process.argv[4],
    latestSource: process.argv[5],
  }));
' \
  "$project_root/scripts/lib/custom-install-status.js" \
  "$installed_base" \
  "$latest_base" \
  "$installed_source" \
  "$latest_source")"

echo "status=$status"
echo "installed_version=${installed_version:-unknown}"
echo "installed_base=${installed_base:-unknown}"
echo "installed_source=${installed_source:-unknown}"
echo "latest_release=$latest_release"
echo "latest_base=$latest_base"
echo "latest_source=${latest_source:-unknown}"
echo "latest_build_url=${latest_build_url:-unknown}"

if [[ "$notify" == true && "$status" != "up-to-date" ]]; then
  osascript -e "display notification \"A tested custom build based on $latest_release is ready for manual review.\" with title \"OpenWhispr Custom update\""
fi
