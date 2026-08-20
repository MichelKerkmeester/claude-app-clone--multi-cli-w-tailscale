// Pure client-side app: no server-side render, no prerender. The transcript, socket, and auth
// all run in the browser against the tailnet relay, so there is nothing to render on a server.
export const ssr = false;
export const prerender = false;
