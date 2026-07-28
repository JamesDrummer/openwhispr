#!/usr/bin/env bash

set -euo pipefail

repository="${OPENWHISPR_CUSTOM_REPOSITORY:-JamesDrummer/openwhispr}"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# GitHub may disable scheduled workflows in an inactive public repository.
# A local monitor run is explicit evidence that the fork is still in use, so
# best-effort re-enable the watcher before checking installed state.
gh workflow enable custom-upstream-watch.yml --repo "$repository" >/dev/null 2>&1 || true

bash "$project_root/scripts/check-custom-install.sh" --notify
