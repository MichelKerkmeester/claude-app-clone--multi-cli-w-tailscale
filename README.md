# Pi Remote

> A private PWA and loopback relay for controlling a Pi coding agent from an enrolled phone.

---

## 1. OVERVIEW

Pi Remote pairs a relay next to the Pi coding agent with an installable SvelteKit web client. The
relay owns the Pi RPC process and exposes a loopback HTTP and WebSocket API. Tailscale Serve provides
the private tailnet entrypoint. The web client handles enrollment, session reading, review actions and
the Attention Inbox.

The repository also contains the shared RPC protocol, Pi extensions, deployment assets and release
checks. Start with the package docs below, then open the source maps when you need to edit the web
client.

---

## 2. QUICK START

```bash
npm ci
npm run build
npm run typecheck
npm test
```

Expected result: the protocol, relay, web client and extensions build and their checks pass. Deployment
also requires the tailnet configuration described in [`deploy/README.md`](deploy/README.md).

---

## 3. STRUCTURE

```text
Pi Remote/
+-- app-relay/                       # Pi supervision, redacted ledger and relay API
+-- app-mobile/                      # SvelteKit PWA package
+-- packages/pi-rpc-protocol/        # Shared RPC contracts and guards
+-- extensions/                      # Pi approval and plan extensions
+-- deploy/                          # Tailscale Serve and containment assets
+-- scripts/                         # Release and verification commands
+-- release/                         # Thresholds, rollout data and evidence
`-- tests/                           # Repository-level checks
```

---

## 4. RELATED RESOURCES

| Area | README | Code map |
|---|---|---|
| Relay package | [`app-relay/README.md`](app-relay/README.md) | [`app-relay/src/README.md`](app-relay/src/README.md) |
| Web package | [`app-mobile/README.md`](app-mobile/README.md) | [`app-mobile/src/README.md`](app-mobile/src/README.md) |
| Web source | [`app-mobile/src/README.md`](app-mobile/src/README.md) | [`app-mobile/src/CODE.md`](app-mobile/src/CODE.md) |
| URL surface | [`app-mobile/src/routes/README.md`](app-mobile/src/routes/README.md) | [`app-mobile/src/routes/CODE.md`](app-mobile/src/routes/CODE.md) |
| Attention route | [`app-mobile/src/routes/attention/[lookupId]/README.md`](app-mobile/src/routes/attention/[lookupId]/README.md) | [`app-mobile/src/routes/attention/[lookupId]/CODE.md`](app-mobile/src/routes/attention/[lookupId]/CODE.md) |
| Session route | [`app-mobile/src/routes/session/[id]/README.md`](app-mobile/src/routes/session/[id]/README.md) | [`app-mobile/src/routes/session/[id]/CODE.md`](app-mobile/src/routes/session/[id]/CODE.md) |
| Protocol package | [`packages/pi-rpc-protocol/README.md`](packages/pi-rpc-protocol/README.md) | [`packages/pi-rpc-protocol/src/README.md`](packages/pi-rpc-protocol/src/README.md) |
| Operations | [`deploy/README.md`](deploy/README.md) | [`scripts/README.md`](scripts/README.md) |
