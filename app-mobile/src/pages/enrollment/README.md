# Enrollment

> Enrollment binds this browser to the relay once, establishes a device session and keeps the app read-only by default.

---

## 1. OVERVIEW

Enrollment is the first-run auth branch. The app shell renders it instead of Home, Chat, Review or
Inbox until `establishSession` returns an authenticated device identity. A person can paste the
short-lived QR data or scan a QR image, then select Enroll device.

The screen handles input, busy state and user-facing errors. [shared/transport/auth.ts](../../shared/transport/auth.ts)
owns QR validation, key generation, relay enrollment, session proof and IndexedDB storage. The
device creates a non-extractable P-256 signing key and the relay checks the enrollment origin and
challenge expiry before accepting it.

Enrollment is an auth branch, not a route. The shell controls when it appears. Its security posture
is fixed: loopback relay access, tailnet-only Serve and no path for the phone to enable full access.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Surface type | Shell auth branch |
| Input modes | Paste QR data or scan an image when BarcodeDetector exists |
| Device key | Non-extractable P-256 ECDSA key stored in IndexedDB |
| Post-enrollment mode | Authenticated read-only application session |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| QR paste | Accepts serialized enrollment data without reflecting untrusted input in an error message. |
| QR scan | Uses the browser BarcodeDetector when available and falls back to paste when it is not. |
| Origin and expiry checks | Rejects enrollment data for another relay origin or an expired challenge. |
| Device key creation | Generates a P-256 ECDSA key pair in the browser and sends only the public key and proof. |
| Session establishment | Signs a relay challenge with the stored device key and hands the identity back to the shell. |
| Auth gate | Shows a checking state while the shell is authenticating and keeps the application behind the gate. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Relay QR data | A valid, unexpired enrollment challenge for the current origin | Invalid JSON, wrong origin and expired challenges are rejected. |
| Browser crypto | Web Crypto ECDSA P-256 support | The private key is generated as non-extractable. |
| Device storage | IndexedDB | The device record stores the private key, device id, host fingerprint and origin. |
| QR scanning | Optional BarcodeDetector | Paste remains the supported fallback when image scanning is unavailable. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`screen-enrollment.svelte`](./screen-enrollment.svelte) | Renders the enrollment form, scan input, busy state and auth barrier. |
| [`screen-enrollment.stories.ts`](./screen-enrollment.stories.ts) | Exercises idle and authenticating states. |
| [shared/transport/auth.ts](../../shared/transport/auth.ts) | Owns enrollment proof, session proof, device storage, logout and revocation. |
| [routes/+layout.svelte](../../routes/+layout.svelte) | Chooses the Enrollment branch and receives the enrolled identity. |

The component boundaries and auth handoff are in [`CODE.md`](./CODE.md).

---

## 5. CONFIGURATION

The screen has no local configuration file. Its behavior is controlled by the auth phase and two
callbacks.

| Input | Effect |
|---|---|
| `phase` | Shows the auth barrier while the shell is authenticating. |
| `onEnrolled` | Returns the new device identity to the shell after session establishment. |
| QR data | Starts enrollment only when non-empty after trimming. |

---

## 6. USAGE EXAMPLES

| Situation | What the person sees or does |
|---|---|
| First launch without a device record | The shell shows Bind this phone once. |
| A QR image is available | Select Scan image. The decoded value fills the enrollment field. |
| Scanning is unavailable | Paste the QR data and select Enroll device. |
| Enrollment is running | The button says Binding device and the controls stay tied to the current request. |
| Session proof is running | The shell shows Checking this device. |
| Enrollment succeeds | The shell receives the device identity and continues into the authenticated app. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The enrollment data is invalid | The pasted value is not a recognized challenge. | Paste the complete QR payload again. |
| This enrollment belongs to a different relay origin | The QR challenge was issued for another origin. | Generate a challenge from the relay serving this app. |
| This enrollment challenge has expired | The short-lived challenge deadline passed. | Generate a new QR challenge and scan or paste it. |
| QR image scanning is not available | The browser has no BarcodeDetector. | Paste the QR data instead. |
| No QR code was found in that image | The selected image does not contain a detectable QR code. | Choose a sharper QR image or paste its data. |
| Device authentication failed | Session challenge or storage setup failed. | Keep the app at the auth gate and retry after checking browser storage and relay access. |

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Auth branch flow and ownership boundary between the screen and auth module. |
| [Routes layout](../../routes/+layout.svelte) | Shows Enrollment before routed pages and overlays. |
| [Home README](../home/README.md) | Describes the authenticated root surface reached after enrollment. |
| [Shared auth module](../../shared/transport/auth.ts) | Documents the cryptographic and storage implementation used by the screen. |
