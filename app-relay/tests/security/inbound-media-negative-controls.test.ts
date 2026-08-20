import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  AuthService,
  type ArtifactPublishTicketBinding,
} from '../../src/auth/auth-service.js';
import { authorizeAction } from '../../src/auth/policy.js';

const SERVER_SOURCE = readFileSync(new URL('../../src/http/server.ts', import.meta.url), 'utf8');
const MIGRATION_SOURCE = readFileSync(
  new URL('../../migrations/006-inbound-artifacts.up.sql', import.meta.url),
  'utf8',
);

const BINDING: ArtifactPublishTicketBinding = {
  hostExtension: 'host_extension_001',
  sessionId: 'session_inbound_001',
  runId: 'run_inbound_001',
  turnId: 'turn_inbound_001',
  blockId: 'block_inbound_negative_001',
  submissionId: 'submission_inbound_001',
  expectedTranscriptRevision: 0,
  declaredByteLength: 128,
  declaredMediaFamily: 'screenshot',
};

describe('inbound media negative controls', () => {
  it('binds one-use publication authority to the complete context and denies replay/wrong context', () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const auth = new AuthService({
      origin: 'https://pi-remote.example.test',
      hostId: 'host_inbound_001',
      now: () => now,
    });
    const issued = auth.issueArtifactPublishTicketForExtension(
      'principal_inbound_001',
      BINDING.hostExtension,
      BINDING.sessionId,
      BINDING,
    );
    expect(Date.parse(issued.startDeadline) - now).toBe(90_000);
    expect(
      auth.consumeArtifactPublishTicket(issued.ticket, {
        origin: 'extension',
        principal: 'principal_inbound_001',
        hostExtension: 'other_extension_001',
      }),
    ).toBeNull();
    const consumed = auth.consumeArtifactPublishTicket(issued.ticket, {
      origin: 'extension',
      principal: 'principal_inbound_001',
      hostExtension: BINDING.hostExtension,
      expectedBinding: BINDING,
    });
    expect(consumed).toMatchObject({ binding: BINDING, extensionOnly: true });
    expect(
      auth.consumeArtifactPublishTicket(issued.ticket, {
        origin: 'extension',
        principal: 'principal_inbound_001',
        hostExtension: BINDING.hostExtension,
      }),
    ).toBeNull();
    now += 90_001;
    const expired = auth.issueArtifactPublishTicketForExtension(
      'principal_inbound_001',
      BINDING.hostExtension,
      BINDING.sessionId,
      BINDING,
    );
    now += 90_001;
    expect(
      auth.consumeArtifactPublishTicket(expired.ticket, {
        origin: 'extension',
        principal: 'principal_inbound_001',
        hostExtension: BINDING.hostExtension,
      }),
    ).toBeNull();
  });

  it('rejects browser-origin consumption and keeps unknown actions denied', () => {
    const auth = new AuthService({
      origin: 'https://pi-remote.example.test',
      hostId: 'host_inbound_001',
    });
    const issued = auth.issueArtifactPublishTicketForExtension(
      'principal_inbound_001',
      BINDING.hostExtension,
      BINDING.sessionId,
      BINDING,
    );
    expect(
      auth.consumeArtifactPublishTicket(issued.ticket, {
        origin: 'https://pi-remote.example.test',
        principal: 'principal_inbound_001',
        hostExtension: BINDING.hostExtension,
      }),
    ).toBeNull();
    expect(authorizeAction('artifact:publish')).toBe(true);
    expect(authorizeAction('artifact:publish-anything')).toBe(false);
  });

  it('keeps the extension binary body behind ticket consumption and outside the browser ingress lane', () => {
    const routeIndex = SERVER_SOURCE.indexOf('async function handleInboundPublishRoute');
    const ticketIndex = SERVER_SOURCE.indexOf('auth.consumeArtifactPublishTicket', routeIndex);
    const contentLengthIndex = SERVER_SOURCE.indexOf('const contentLength = exactContentLength(request)', routeIndex);
    expect(ticketIndex).toBeGreaterThan(-1);
    expect(contentLengthIndex).toBeGreaterThan(ticketIndex);
    expect(SERVER_SOURCE).toContain("error: 'browser_origin_rejected'");
    expect(SERVER_SOURCE).toContain("path === '/api/extension/artifacts/publish'");
    expect(SERVER_SOURCE).not.toContain("actionForRequest('/api/extension/artifacts/publish'");
  });

  it('keeps source material and decoder/OCR detail out of durable inbound columns', () => {
    expect(MIGRATION_SOURCE).not.toMatch(/artifact_bytes|source_path|file_path|url|ocr|decoder|base64|filename/iu);
    expect(MIGRATION_SOURCE).toContain('full_digest');
    expect(MIGRATION_SOURCE).toContain('thumbnail_digest');
    expect(MIGRATION_SOURCE).toContain('retention_until');
  });
});
