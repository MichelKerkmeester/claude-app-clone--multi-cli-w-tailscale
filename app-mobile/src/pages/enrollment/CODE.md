# enrollment/: auth branch and device proof handoff

---

## 1. OVERVIEW

`enrollment/` is a flat single-screen package for the unauthenticated branch of the application.
It owns the QR input, scan result, busy flag and visible error. The cryptographic proof, relay
requests and IndexedDB record belong to [shared/transport/auth.ts](../../shared/transport/auth.ts).

Current state:

- [`screen-enrollment.svelte`](./screen-enrollment.svelte) renders the form and calls the auth module.
- The screen accepts pasted QR data or a decoded QR image and does not reflect raw invalid input in error text.
- `enrollDevice` verifies origin and expiry, creates a non-extractable P-256 key, signs enrollment proof and stores the device record.
- `establishSession` signs a relay challenge with the stored key. The shell receives the identity through `onEnrolled` and takes over the authenticated app.

---

## 2. ARCHITECTURE

```text
routes/+layout.svelte
        |
        +--> authReady = false
        |          |
        |          v
        |    screen-enrollment.svelte
        |          |
        |          +--> scanQrImage()
        |          +--> enrollDevice()
        |          `--> establishSession()
        |                     |
        |                     v
        `----------- onEnrolled(device)
                              |
                              v
                    authenticated shell and routes
```

The screen is not a route and does not render beside a routed page. The shell selects it before the
route content when no authenticated device session exists.

---

## 3. PACKAGE TOPOLOGY

```text
screen-enrollment.svelte
        |
        +--> input and busy state
        +--> shared Button primitive
        +--> shared error formatting
        `--> shared transport/auth.ts
                 |
                 +--> Web Crypto proof
                 +--> relay auth endpoints
                 `--> IndexedDB device record
```

Allowed dependency direction:

```text
shell → Enrollment props → screen → auth transport → relay and device storage
```

The screen must not implement key generation, proof formatting or device storage. The auth module
must not render UI or decide whether the app shell is ready.

---

## 4. DIRECTORY TREE

The folder is flat. This inventory names every direct file other than the README.

| File | Responsibility |
|---|---|
| [`screen-enrollment.svelte`](./screen-enrollment.svelte) | Renders QR input, scan action, enrollment action, errors and auth barrier. |
| [`screen-enrollment.stories.ts`](./screen-enrollment.stories.ts) | Exercises idle and authenticating phases. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`screen-enrollment.svelte`](./screen-enrollment.svelte) | Owns local form and request state, then returns the identity to the shell. |
| [shared/transport/auth.ts](../../shared/transport/auth.ts) | Validates challenges, creates and signs the device proof, establishes sessions and stores credentials. |
| [Routes layout](../../routes/+layout.svelte) | Starts session establishment and chooses the auth branch. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Auth branch | The shell shows Enrollment until `authReady` becomes true. |
| Input | The screen trims pasted data and sends the serialized challenge to the auth module. |
| QR scan | `scanQrImage` is optional. The paste field remains the fallback. |
| Enrollment proof | `enrollDevice` checks origin and expiry before generating a P-256 key and sending public proof. |
| Device storage | The auth module stores the non-extractable private key in IndexedDB and clears it on revocation. |
| Session proof | `establishSession` signs the relay challenge and returns an application identity or null. |
| Access posture | The enrolled phone remains read-only. This folder does not enable full-access actions. |

Main flow:

```text
QR data or image
       |
       v
parse and validate challenge
       |
       v
generate device key and enrollment proof
       |
       v
relay enroll response
       |
       v
store device record
       |
       v
sign session challenge
       |
       v
onEnrolled → shell authReady
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`screen-enrollment.svelte`](./screen-enrollment.svelte) | Svelte component | Mounted by the shell for an unenrolled or unauthenticated device. |
| `EnrollmentProps` | Interface | Defines auth phase and enrolled-identity callback. |
| `submit` | Function | Starts device enrollment, session establishment and the shell handoff. |
| `scanQrImage` | Function | Decodes a QR image when the browser supports BarcodeDetector. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The folder is healthy when the scan finds both documents and no broken-reference entry for
`pages/enrollment`.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Routes layout](../../routes/+layout.svelte)
- [Shared auth module](../../shared/transport/auth.ts)
- [Home README](../home/README.md)
