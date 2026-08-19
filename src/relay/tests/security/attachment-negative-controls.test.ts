// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Security Negative Controls
// ───────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { isMediaFeatureEnabled } from '../../src/auth/policy.js';
import { AttachmentService } from '../../src/attachments/attachment-service.js';
import { AttachmentServiceError } from '../../src/attachments/attachment-types.js';

const decoderSourceUrl = new URL('../../src/attachments/attachment-decoder.ts', import.meta.url);
const serviceSourceUrl = new URL('../../src/attachments/attachment-service.ts', import.meta.url);
const serverSourceUrl = new URL('../../src/http/server.ts', import.meta.url);
const typesSourceUrl = new URL('../../src/attachments/attachment-types.ts', import.meta.url);
const indexSourceUrl = new URL('../../src/index.ts', import.meta.url);

describe('attachment isolation and fail-closed controls', () => {
  it('keeps all codec access behind independent WASM modules', async () => {
    const source = await readFile(decoderSourceUrl, 'utf8');
    expect(source).toContain('WebAssembly.compile');
    expect(source).toContain('assertLinearMemory');
    expect(source).toContain("import('@jsquash/jpeg/decode.js')");
    expect(source).toContain("import('@jsquash/png/decode.js')");
    expect(source).toContain("import('@jsquash/webp/decode.js')");
    expect(source).not.toMatch(
      /worker_threads|worker_threads|node:child_process|sharp|jimp|canvas|ffi/u,
    );
  });

  it('parses the header before the only decode call and never allocates from client dimensions', async () => {
    const source = await readFile(decoderSourceUrl, 'utf8');
    const sniffIndex = source.indexOf('export function sniffImage');
    const decodeIndex = source.indexOf('export async function decodeImage');
    expect(sniffIndex).toBeGreaterThanOrEqual(0);
    expect(decodeIndex).toBeGreaterThan(sniffIndex);
    expect(source).toContain('parsed.width > MAX_SOURCE_EDGE');
    expect(source).toContain('parsed.width > Math.floor(MAX_DECODED_AREA / parsed.height)');
    expect(source).toContain('parsed.channels > 4');
    expect(source).toContain('parsed.frames > 1');
    expect(source).toContain('parsed.animated');
  });

  it('consumes the upload ticket before handing the request stream to the service', async () => {
    const source = await readFile(serverSourceUrl, 'utf8');
    const uploadIndex = source.indexOf("if (route.operation === 'upload')");
    const firstTicket = source.indexOf(
      '  const ticketId = attachmentTicketFromRequest(request);',
      uploadIndex,
    );
    const uploadEnd = source.indexOf(
      '  const ticketId = attachmentTicketFromRequest(request);',
      firstTicket + 1,
    );
    const uploadBlock = source.slice(uploadIndex, uploadEnd);
    const bodyIndex = uploadBlock.indexOf('body: request');
    const consumeIndex = uploadBlock.indexOf('auth.consumeAttachmentTicket(');
    const jsonReaderIndex = uploadBlock.indexOf('readJsonBody(request)');
    expect(uploadIndex).toBeGreaterThanOrEqual(0);
    expect(uploadEnd).toBeGreaterThan(uploadIndex);
    expect(consumeIndex).toBeGreaterThanOrEqual(0);
    expect(bodyIndex).toBeGreaterThan(consumeIndex);
    expect(jsonReaderIndex).toBe(-1);
    expect(source).toContain('options.mediaEnabled !== true');
    expect(source).toContain("sendJson(response, 404, { error: 'not_found' })");
  });

  it('does not expose pixel-bearing DTO fields or durable relay integrations', async () => {
    const [types, service] = await Promise.all([
      readFile(typesSourceUrl, 'utf8'),
      readFile(serviceSourceUrl, 'utf8'),
    ]);
    expect(types).not.toMatch(/\b(Buffer|ArrayBuffer|Uint8Array|base64)\b/u);
    expect(service).not.toMatch(
      /better-sqlite|RelayStore|transcript|syncHub|console\.(log|error)/u,
    );
    expect(service).toContain('join(this.root, `${kind}_');
  });

  it('keeps media disabled unless the exact host flag is enabled', async () => {
    expect(isMediaFeatureEnabled(undefined)).toBe(false);
    expect(isMediaFeatureEnabled('0')).toBe(false);
    expect(isMediaFeatureEnabled('true')).toBe(false);
    expect(isMediaFeatureEnabled('1')).toBe(true);
    const index = await readFile(indexSourceUrl, 'utf8');
    expect(index).toContain('const mediaEnabled = isMediaFeatureEnabled();');
    expect(index).not.toMatch(/PI_REMOTE_MEDIA_ENABLED\s*=\s*['"]1/u);
  });

  it('does not turn opaque route identifiers into filesystem paths', async () => {
    const service = new AttachmentService({
      quarantineRoot: '/tmp/pi-remote-attachment-negative-control',
      currentEpoch: 'epoch_test',
    });
    expect(service.getReservation('../set')).toBeNull();
    expect(service.getPartRecords('../set')).toBeNull();
    expect(() =>
      service.status('../set', {
        sessionToken: 'token_test',
        sessionId: 'session_local',
        sessionEpoch: 'epoch_test',
        deviceId: 'device_test',
        principal: 'operator@example.test',
        origin: 'https://pi-remote.example.test',
      }),
    ).toThrowError(new AttachmentServiceError('not_found'));
    const source = await readFile(serviceSourceUrl, 'utf8');
    expect(source).not.toContain('join(this.root, input.setId)');
    expect(source).not.toContain('join(this.root, input.partId)');
  });
});
