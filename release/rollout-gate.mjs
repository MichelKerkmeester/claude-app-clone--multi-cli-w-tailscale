// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Rollout Evaluator
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export function evaluateRollout(config, evidence) {
  const failures = [];
  if (config?.schemaVersion !== 1 || !Array.isArray(config.stages)) {
    return {
      machineStatus: 'FAIL',
      failures: ['Rollout configuration must use schemaVersion 1.'],
      stages: [],
    };
  }
  const seen = new Set();
  const stages = config.stages.map((stage) => {
    if (
      typeof stage?.id !== 'string' ||
      stage.id.length === 0 ||
      seen.has(stage.id) ||
      typeof stage.killSwitch !== 'string' ||
      stage.killSwitch.length === 0 ||
      !Array.isArray(stage.requires) ||
      stage.requires.length === 0
    ) {
      failures.push('Every rollout stage needs a unique id, kill switch, and evidence subset.');
      return { id: stage?.id ?? 'invalid', status: 'NOT-READY', available: false, evidence: [] };
    }
    seen.add(stage.id);
    const subset = stage.requires.map((id) => ({
      id,
      status: evidence[id]?.status ?? 'UNRUN',
    }));
    const ready = subset.every((item) => item.status === 'PASS');
    return {
      id: stage.id,
      label: stage.label,
      status: ready ? 'READY' : 'NOT-READY',
      available: ready,
      killSwitch: stage.killSwitch,
      evidence: subset,
    };
  });
  return {
    machineStatus: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    stages,
  };
}

export function validateOperatorEvidence(document) {
  if (document === undefined) return {};
  if (
    document?.schemaVersion !== 1 ||
    typeof document.evidence !== 'object' ||
    document.evidence === null
  ) {
    throw new Error('Operator evidence must use schemaVersion 1.');
  }
  const validated = {};
  for (const [id, record] of Object.entries(document.evidence)) {
    const validDate =
      typeof record?.verifiedAt === 'string' && Number.isFinite(Date.parse(record.verifiedAt));
    if (
      record?.status !== 'PASS' ||
      !validDate ||
      typeof record.reviewer !== 'string' ||
      record.reviewer.length === 0 ||
      typeof record.artifact !== 'string' ||
      record.artifact.length === 0 ||
      record.artifact.startsWith('/')
    ) {
      throw new Error(`Operator evidence '${id}' is incomplete or uses an absolute artifact path.`);
    }
    validated[id] = { status: 'PASS' };
  }
  return validated;
}
