---
title: 'Containment: macOS sandbox-exec Profile'
description: 'Default-deny sandbox-exec profile and escape-class denial checks for the protected runner.'
trigger_phrases:
  - 'sandbox-exec containment'
  - 'pi-remote.sb'
  - 'containment escape test'
---

# Containment: macOS sandbox-exec Profile

---

## 1. OVERVIEW

`containment/` holds the macOS `sandbox-exec` profile and its escape test. The profile uses default deny, grants read and write only under the named workspace, denies credential and host paths, denies network access, and restricts executable launch to the initial runner. It complements approval and does not replace exact-action authorization.

Current state:

- `pi-remote.sb` is the Seatbelt profile in SBPL syntax
- `escape-tests.sh` checks five escape classes plus a workspace write
- `sandbox-exec` is deprecated but still available on supported macOS hosts

Pin and test the actual target OS before enabling mutation.

---

## 2. FILES

| File              | Responsibility                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pi-remote.sb`    | Default-deny profile with workspace read and write, RUNNER-only exec, and denied credential, host, and network paths |
| `escape-tests.sh` | Writes one workspace file and asserts denial for filesystem, credential, process, UID, and network escapes           |

---

## 3. BOUNDARIES

| Rule                                                | Effect                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `(deny default)`                                    | Everything is denied unless another rule allows it                   |
| `(allow process-fork)`                              | Child processes may be forked                                        |
| `(allow process-exec (literal (param "RUNNER")))`   | Only the configured runner path may exec                             |
| `(allow signal (target self))`                      | Signals to the running process are allowed                           |
| `(allow file-read-metadata)`                        | Metadata reads are allowed globally                                  |
| `(allow file-read* ...)`                            | Read only under `/System`, `/usr/lib`, `/usr/share`, and `WORKSPACE` |
| `(allow file-write* (subpath (param "WORKSPACE")))` | Write only under the workspace                                       |
| `(deny file-read* (subpath (param "HOME")))`        | Credential and dotfile paths are unreadable                          |
| `(deny file-write* ...)`                            | No writes under `/tmp`, `/private`, or `/Users`                      |
| `(deny network*)`                                   | All network egress is blocked                                        |
| `(deny process-exec*)`                              | The rest of the exec surface is denied                               |

---

## 4. ESCAPE TEST

Use a disposable workspace. The test writes one file inside it and expects every filesystem, process, credential, UID, and network escape attempt to fail:

```bash
export PI_REMOTE_WORKSPACE="$PWD/containment-fixture"
mkdir -p "$PI_REMOTE_WORKSPACE"
sandbox-exec \
  -D WORKSPACE="$PI_REMOTE_WORKSPACE" \
  -D HOME="$HOME" \
  -D RUNNER="/bin/bash" \
  -f deploy/containment/pi-remote.sb \
  /bin/bash deploy/containment/escape-tests.sh
```

An exit status of `0` means the workspace write succeeded and all escape classes were denied:

| Check                        | Expectation                           |
| ---------------------------- | ------------------------------------- |
| workspace write              | Succeeds inside `PI_REMOTE_WORKSPACE` |
| filesystem-outside-workspace | Write to `/tmp` fails                 |
| credential-read              | `$HOME/.ssh/id_rsa` read fails        |
| process-spawn                | `/usr/bin/id` exec fails              |
| uid-escalation               | `sudo -n true` fails                  |
| network-egress               | `curl` to `https://example.com` fails |

---

## 5. VALIDATION

Run from the app root:

```bash
sh deploy/containment/escape-tests.sh
```

The script alone requires `PI_REMOTE_WORKSPACE`. The `sandbox-exec` invocation in section 4 is the full verification. Capture the exit status on the deployment Mac before enabling the server-side mutation switch. Also verify the protected runner exits on its lease abort signal. If any row fails, keep mutation off and retain read-only monitoring.

---

## 6. RELATED

- [`../README.md`](../README.md)
- [`../../docs/security.md`](../../docs/security.md)
- [`../../release/rollout.json`](../../release/rollout.json) feeds the `operator:containment-real-os` evidence item
