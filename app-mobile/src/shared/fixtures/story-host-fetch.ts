// ───────────────────────────────────────────────────────────────────
// MODULE: Story host fetch interceptor
// ───────────────────────────────────────────────────────────────────
// Stories that mount surfaces which POST to the relay need a host answer
// in isolation. This interceptor answers those paths and leaves every other
// fetch — Storybook's own loads included — on the real window.fetch.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type StoryHostFetchResult = Response | unknown;

export type StoryHostFetchRoutes = Readonly<
  Record<string, (body: unknown) => StoryHostFetchResult>
>;

// ───────────────────────────────────────────────────────────────────
// 2. URL AND BODY HELPERS
// ───────────────────────────────────────────────────────────────────

function requestPath(input: RequestInfo | URL): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(raw, 'http://storybook.local').pathname;
  } catch {
    return raw;
  }
}

function requestBody(init: RequestInit | undefined): unknown {
  if (init?.body === undefined || init.body === null) return undefined;
  if (typeof init.body !== 'string') return undefined;
  try {
    return JSON.parse(init.body) as unknown;
  } catch {
    return undefined;
  }
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. INSTALL
// ───────────────────────────────────────────────────────────────────

/** Answer listed POST paths, then restore the previous fetch on cleanup. */
export function installStoryHostFetch(routes: StoryHostFetchRoutes): () => void {
  const previous = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (init?.signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    const handler = routes[requestPath(input)];
    if (handler === undefined) return previous(input, init);
    const result = handler(requestBody(init));
    return result instanceof Response ? result : jsonResponse(result);
  };
  return () => {
    window.fetch = previous;
  };
}

/** Deterministic host-error response for stories that must record the failure surface. */
export function storyHostHttpError(status: number): Response {
  return new Response('', { status });
}
