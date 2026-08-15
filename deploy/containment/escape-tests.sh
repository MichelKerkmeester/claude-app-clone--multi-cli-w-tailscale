#!/bin/bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: SANDBOX CONTAINMENT ESCAPE TESTS
# ───────────────────────────────────────────────────────────────
# Probes that must fail inside the deploy containment profile.
# Exits with the number of failed probes.
set -u

failures=0
workspace="${PI_REMOTE_WORKSPACE:?Set PI_REMOTE_WORKSPACE to an isolated test workspace.}"

expect_denied() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'FAIL %s unexpectedly succeeded\n' "$name"
    failures=$((failures + 1))
  else
    printf 'PASS %s denied\n' "$name"
  fi
}

printf 'workspace-ok\n' > "$workspace/containment-write.txt" || failures=$((failures + 1))
expect_denied filesystem-outside-workspace /bin/bash -c 'printf escaped > /tmp/pi-remote-escape'
expect_denied credential-read /bin/bash -c 'test -r "$HOME/.ssh/id_rsa" && IFS= read -r _ < "$HOME/.ssh/id_rsa"'
expect_denied process-spawn /usr/bin/id -u
expect_denied uid-escalation /usr/bin/sudo -n true
expect_denied network-egress /usr/bin/curl --max-time 2 https://example.com

exit "$failures"
