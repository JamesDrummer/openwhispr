#!/usr/bin/env bash

set -euo pipefail

mode="${1:---plan}"
if [[ "$mode" != "--plan" && "$mode" != "--apply" ]]; then
  echo "Usage: bash scripts/install-custom-update-monitor.sh [--plan|--apply]" >&2
  exit 2
fi

label="com.james.openwhispr-custom-update-monitor"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
maintenance_root="$HOME/Library/Application Support/OpenWhispr Custom Maintenance"
installed_scripts_dir="$maintenance_root/scripts"
monitor_script="$installed_scripts_dir/run-custom-update-monitor.sh"
launch_agents_dir="$HOME/Library/LaunchAgents"
plist_path="$launch_agents_dir/$label.plist"
log_path="$HOME/Library/Logs/OpenWhisprCustomUpdateMonitor.log"

echo "Source checkout: $project_root"
echo "Monitor script: $monitor_script"
echo "LaunchAgent:    $plist_path"
echo "Log:            $log_path"
echo "Schedule:       at login, then every 24 hours"

if [[ "$mode" == "--plan" ]]; then
  echo
  echo "Plan only: no files were changed and no scheduled job was loaded."
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This update monitor is only intended for macOS." >&2
  exit 1
fi

if [[ -e "$plist_path" ]]; then
  echo "A monitor already exists at $plist_path; refusing to overwrite it." >&2
  exit 1
fi

if ! command -v gh >/dev/null; then
  echo "GitHub CLI is required by the update monitor." >&2
  exit 1
fi

gh_path="$(command -v gh)"
mkdir -p "$launch_agents_dir" "$(dirname "$log_path")" "$installed_scripts_dir"
install -m 755 "$project_root/scripts/run-custom-update-monitor.sh" "$monitor_script"
install -m 755 \
  "$project_root/scripts/check-custom-install.sh" \
  "$installed_scripts_dir/check-custom-install.sh"

cat >"$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$monitor_script</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$gh_path"):/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>86400</integer>
  <key>StandardOutPath</key>
  <string>$log_path</string>
  <key>StandardErrorPath</key>
  <string>$log_path</string>
</dict>
</plist>
EOF

plutil -lint "$plist_path"
launchctl bootstrap "gui/$(id -u)" "$plist_path"
echo "Custom update monitor installed and loaded."
