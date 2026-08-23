# Research Resource Map

| Angle | Source files |
|---|---|
| Lifecycle and ordering | `src/remote/SessionsWebSocket.ts`, `src/bridge/remoteBridgeCore.ts`, `src/bridge/flushGate.ts`, `src/bridge/jwtUtils.ts`, `src/bridge/bridgeMessaging.ts` |
| Permission protocol | `src/remote/RemoteSessionManager.ts`, `src/bridge/bridgeMessaging.ts`, `src/types/permissions.ts`, `src/entrypoints/sdk/controlSchemas.ts` |
| Security and attachments | `src/bridge/trustedDevice.ts`, `src/bridge/workSecret.ts`, `src/bridge/inboundAttachments.ts`, `src/bridge/inboundMessages.ts` |
| Returning-user UX | `src/hooks/useAwaySummary.ts`, `src/services/awaySummary.ts`, `src/bridge/bridgeStatusUtil.ts` |
| Pairing and direct connect | `src/bridge/bridgeUI.ts`, `src/server/directConnectManager.ts`, `src/server/createDirectConnectSession.ts` |
| Transcript normalization | `src/remote/sdkMessageAdapter.ts`, `src/remote/RemoteSessionManager.ts` |
