// ───────────────────────────────────────────────────────────────────
// MODULE: Prose Link Classification Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  canRouteProsePathToArtifact,
  classifyProseLink,
} from '../src/pages/chat/rich-content/prose-link.js';

describe('classifyProseLink', () => {
  it('opens http(s) and keeps file-path tokens inert', () => {
    expect(classifyProseLink('https://example.com/docs')).toEqual({
      kind: 'external-url',
      destination: 'https://example.com/docs',
      openable: true,
    });
    expect(classifyProseLink('./README.md')).toMatchObject({
      kind: 'file-path',
      openable: false,
    });
    expect(classifyProseLink('file:///tmp/secret')).toMatchObject({
      kind: 'unavailable',
      openable: false,
    });
    expect(classifyProseLink('javascript:alert(1)')).toMatchObject({
      kind: 'unavailable',
      openable: false,
    });
  });

  it('routes a path only when the host supplies an artifact ref', () => {
    expect(canRouteProsePathToArtifact(undefined)).toBe(false);
    expect(canRouteProsePathToArtifact('')).toBe(false);
    expect(canRouteProsePathToArtifact('artifact_policy_001')).toBe(true);
  });
});
