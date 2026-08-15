import type { RuntimeMode } from '@pi-remote/pi-rpc-protocol';

export const PLAN_STATUS_KEY = 'pi-remote-plan-mode';

export function parsePlanStatus(record: unknown): RuntimeMode | null {
  let isPlanStatusRequest: boolean;
  try {
    if (!isRecord(record)) {
      return null;
    }
    isPlanStatusRequest =
      record.type === 'extension_ui_request' &&
      record.method === 'setStatus' &&
      record.statusKey === PLAN_STATUS_KEY;
  } catch {
    return null;
  }

  if (!isPlanStatusRequest) {
    return null;
  }

  try {
    const statusText = record.statusText;
    if (statusText === 'build' || statusText === 'plan' || statusText === 'executing-plan') {
      return statusText;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
