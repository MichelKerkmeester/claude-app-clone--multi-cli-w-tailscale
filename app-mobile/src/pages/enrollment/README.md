# Enrollment screen

`Enrollment.svelte` — the **device-enrollment auth gate**. It's an auth *branch*, not a route: the shell shows Enrollment instead of the app until a device is enrolled and a session established.

Single-component screen. Enrollment drives `shared/data/auth.ts` (QR scan → enroll device → establish session), which stores the device key in IndexedDB. The security posture (loopback relay, tailnet-only Serve, the phone never enabling full-access) is frozen — don't change what this gate lets through.
