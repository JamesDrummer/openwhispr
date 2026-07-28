#!/usr/bin/env bash

set -euo pipefail

mode="${1:---plan}"
if [[ "$mode" != "--plan" && "$mode" != "--apply" ]]; then
  echo "Usage: bash scripts/prepare-custom-profile.sh [--plan|--apply]" >&2
  exit 2
fi

official_profile="$HOME/Library/Application Support/open-whispr"
custom_profile="$HOME/Library/Application Support/OpenWhispr-custom"
official_cache="$HOME/.cache/openwhispr"
custom_cache="$HOME/.cache/openwhispr-custom"

echo "Official profile: $official_profile"
echo "Custom profile:   $custom_profile"
echo "Official cache:   $official_cache"
echo "Custom cache:     $custom_cache"

if [[ "$mode" == "--plan" ]]; then
  echo
  echo "Plan only: no files were changed."
  echo "The apply step will make APFS copy-on-write clones, leaving the official data untouched."
  echo "Quit OpenWhispr first, then run this script with --apply."
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This profile preparation script is only intended for macOS." >&2
  exit 1
fi

if pgrep -x "OpenWhispr" >/dev/null || pgrep -x "OpenWhispr Custom" >/dev/null; then
  echo "Quit both OpenWhispr and OpenWhispr Custom before copying live application data." >&2
  exit 1
fi

if [[ ! -d "$official_profile" ]]; then
  echo "Official OpenWhispr profile was not found at $official_profile." >&2
  exit 1
fi

if [[ -e "$custom_profile" || -e "$custom_cache" ]]; then
  echo "A custom profile or cache already exists; refusing to overwrite it." >&2
  echo "Existing custom data must be reviewed or backed up manually." >&2
  exit 1
fi

mkdir -p "$(dirname "$custom_profile")" "$(dirname "$custom_cache")"
cp -cR "$official_profile" "$custom_profile"

if [[ -d "$official_cache" ]]; then
  cp -cR "$official_cache" "$custom_cache"
else
  mkdir -p "$custom_cache"
fi

# These files identify a running Chromium instance. They are never useful in
# a cloned, stopped profile and may point at the official app's old process.
find "$custom_profile" -maxdepth 1 -name "Singleton*" -delete

receipt="$custom_profile/custom-profile-receipt.json"
copied_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat >"$receipt" <<EOF
{
  "schemaVersion": 1,
  "copiedAt": "$copied_at",
  "sourceProfile": "$official_profile",
  "sourceCache": "$official_cache",
  "copyMethod": "apfs-clone"
}
EOF
chmod 600 "$receipt"

echo
echo "Custom profile prepared successfully."
echo "The official profile and cache were not modified."
echo "Receipt: $receipt"
