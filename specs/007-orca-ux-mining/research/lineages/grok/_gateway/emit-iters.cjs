#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SESSION = 'fanout-grok-1787718935950-gxg4a7';
const EXEC = { kind: 'cli-cursor', model: 'cursor-grok-4.6-xhigh' };

function rec(n, extra) {
  return {
    type: 'iteration',
    iteration: n,
    run: n,
    mode: 'research',
    target_agent: 'deep-research',
    agent_definition_loaded: true,
    resolved_route: 'Resolved route: mode=research target_agent=deep-research',
    sessionId: SESSION,
    runId: SESSION,
    lineageId: 'grok',
    parentSessionId: SESSION,
    generation: 1,
    status: 'complete',
    executor: EXEC,
    timestamp: `2026-08-26T05:${String(n).padStart(2, '0')}:00Z`,
    ...extra,
  };
}

const iters = [
  rec(4, {
    newInfoRatio: 0.62,
    focus: 'Session-card content-model matrix DTO vs orca lists',
    findingsCount: 3,
    noveltyJustification: 'Unified field matrix and minimum host-field bundle; sources previously opened but the cross-walk is new.',
    keyQuestions: ['q-card-content-model'],
    answeredQuestions: ['q-card-content-model'],
    ruledOut: [{ approach: 'Port full worktree row onto Pi session cards', reason: 'Wrong object: PR/sleep/PTY are workspace not chat session', evidence: 'specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4:48' }],
    graphEvents: [
      { type: 'node', id: 'f-iter004-matrix', kind: 'FINDING', label: 'Minimum host bundle title preview agent attention' },
      { type: 'edge', id: 'e-iter004-matrix-q2', source: 'f-iter004-matrix', target: 'q-card-content-model', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter004-matrix', severity: 'P1', label: 'Minimum host bundle: title, lastMessagePreview, agent, attention' },
      { id: 'f-iter004-search', severity: 'P2', label: 'Search operators consume host fields; chrome is drop-in' },
    ],
    ruledOutLines: [{ direction: 'Port worktree row onto Pi cards', reason: 'Wrong object' }],
  }),
  rec(5, {
    newInfoRatio: 0.86,
    focus: 'Native-chat message-level copy, turn nav, tool fold; no regen',
    findingsCount: 5,
    noveltyJustification: 'First native-chat message pass; confirmed absence of regen/reply/edit-and-resend.',
    keyQuestions: ['q-message-level-chat'],
    answeredQuestions: ['q-message-level-chat'],
    ruledOut: [{ approach: 'Use orca native-chat as source for reply/quote/edit/regen menus', reason: 'Those verbs do not exist in native-chat', evidence: 'grep mobile/src/session regenerat|editAndResend|replyTo: no matches' }],
    graphEvents: [
      { type: 'node', id: 'f-iter005-copy', kind: 'FINDING', label: 'Agent bubble copy plus scroll-to-turn' },
      { type: 'edge', id: 'e-iter005-copy-q3', source: 'f-iter005-copy', target: 'q-message-level-chat', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter005-copy', severity: 'P1', label: 'Agent bubble copy plus scroll-to-turn; user bubbles have no controls' },
      { id: 'f-iter005-tools', severity: 'P2', label: 'Tool calls fold into expandable runs' },
      { id: 'f-iter005-absent', severity: 'P1', label: 'No regen/reply/quote/edit/long-press/in-chat search in native-chat' },
    ],
    ruledOutLines: [{ direction: 'Port reply/quote/edit/regen from orca native-chat', reason: 'Verbs absent' }],
  }),
  rec(6, {
    newInfoRatio: 0.85,
    focus: 'Native-chat composer image @ slash dictation send-lock',
    findingsCount: 5,
    noveltyJustification: 'First composer pass; @ vs slash rules, clipboard upload lease, dictation fail-closed.',
    keyQuestions: ['q-composer-input'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Treat slash /rename /archive as in-app session metadata edits', reason: 'They are Codex CLI catalog strings', evidence: 'specs/context/orca-main/src/shared/native-chat-slash-commands.ts:46:50' }],
    graphEvents: [
      { type: 'node', id: 'f-iter006-at', kind: 'FINDING', label: 'Slash line-leading; @file needs host search' },
      { type: 'edge', id: 'e-iter006-at-q4', source: 'f-iter006-at', target: 'q-composer-input', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter006-send', severity: 'P2', label: 'Send single-flight; never revoke editable; image-only valid' },
      { id: 'f-iter006-at', severity: 'P1', label: 'Slash line-leading; @file needs host search RPC' },
      { id: 'f-iter006-img', severity: 'P1', label: 'Clipboard image is a host upload lease' },
    ],
    ruledOutLines: [{ direction: 'Treat /rename as client metadata', reason: 'CLI catalog string' }],
  }),
  rec(7, {
    newInfoRatio: 0.80,
    focus: 'Streaming pending working indicator input lock drafts',
    findingsCount: 5,
    noveltyJustification: 'Streaming gate vs tab peek, pending image splice, working-vs-streaming split, lease lock.',
    keyQuestions: ['q-session-chat-nav', 'q-composer-input'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Client-invented typing indicator without host agentWorking', reason: 'Orca uses host working flag plus gated streaming bubble', evidence: 'specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:51:56' }],
    graphEvents: [
      { type: 'node', id: 'f-iter007-stream', kind: 'FINDING', label: 'Synthetic streaming bubble gated and throttled' },
      { type: 'edge', id: 'e-iter007-stream-q5', source: 'f-iter007-stream', target: 'q-session-chat-nav', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter007-stream', severity: 'P1', label: 'Streaming bubble gated against transcript catch-up; 50ms throttle' },
      { id: 'f-iter007-pending', severity: 'P2', label: 'Optimistic echo with image preview splice; reject restores draft' },
      { id: 'f-iter007-work', severity: 'P2', label: 'Working bar presentation-only; Stop is host interrupt' },
    ],
    ruledOutLines: [{ direction: 'Fake typing indicator', reason: 'Needs host agentWorking' }],
  }),
  rec(8, {
    newInfoRatio: 0.72,
    focus: 'History panel search, scope tabs, capability fail-closed, resume haptics',
    findingsCount: 4,
    noveltyJustification: 'Panel chrome (scope tabs, search placeholder, skipped banner, capability screen, resume haptics) was not covered by card-row iterations.',
    keyQuestions: ['q-home-parallel-sessions', 'q-session-chat-nav'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Invent Workspace/Project tabs without cwd', reason: 'Would filter everything out or lie', evidence: 'specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:46:49' }],
    graphEvents: [
      { type: 'node', id: 'f-iter008-tabs', kind: 'FINDING', label: 'Scope tabs plus capability fail-closed screen' },
      { type: 'edge', id: 'e-iter008-tabs-q1', source: 'f-iter008-tabs', target: 'q-home-parallel-sessions', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter008-tabs', severity: 'P1', label: 'Workspace/Project/All tabs; host-too-old is not an empty list' },
      { id: 'f-iter008-search', severity: 'P2', label: 'Local search with distinct empty-copy for miss vs none' },
      { id: 'f-iter008-haptic', severity: 'P2', label: 'Resume fail/success haptics; disconnected is error haptic' },
    ],
    ruledOutLines: [{ direction: 'Workspace/Project tabs without cwd', reason: 'Would lie or empty-out' }],
  }),
  rec(9, {
    newInfoRatio: 0.74,
    focus: 'In-chat nav jump-to-latest load-earlier chat/terminal view lock settle',
    findingsCount: 5,
    noveltyJustification: 'FAB vs per-turn arrow split, hasMore pagination, view-mode fail-closed, 600ms lock settle are new versus streaming iteration.',
    keyQuestions: ['q-session-chat-nav'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Copying terminal/chat dual view as a home-screen pattern', reason: 'We have no PTY', evidence: 'specs/context/orca-main/mobile/src/session/use-mobile-session-view-mode.ts:47:49' }],
    graphEvents: [
      { type: 'node', id: 'f-iter009-live', kind: 'FINDING', label: 'Live-edge atBottom plus jump-to-latest FAB' },
      { type: 'edge', id: 'e-iter009-live-q5', source: 'f-iter009-live', target: 'q-session-chat-nav', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter009-live', severity: 'P1', label: 'atBottom gated follow; FAB is list-nav; per-message arrow is turn-nav' },
      { id: 'f-iter009-page', severity: 'P2', label: 'Load-earlier is host hasMore; auto at y<60 plus header button' },
      { id: 'f-iter009-lock', severity: 'P2', label: '600ms input-lock settle so dying sockets cannot flash send enabled' },
    ],
    ruledOutLines: [{ direction: 'Copy terminal/chat dual view', reason: 'No PTY' }],
  }),
  rec(10, {
    newInfoRatio: 0.78,
    focus: '@-file search RPC and AskUserQuestion wizard',
    findingsCount: 3,
    noveltyJustification: 'First pass on files.searchPaths stale-safe search and index-based Ask wizard.',
    keyQuestions: ['q-composer-input'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Device filesystem listing for @-mentions', reason: 'Client must not walk laptop disk', evidence: 'specs/context/orca-main/mobile/src/session/use-mobile-native-chat-file-search.ts:48:125' }],
    graphEvents: [
      { type: 'node', id: 'f-iter010-files', kind: 'FINDING', label: 'Debounced host path search with legacy files.list fallback' },
      { type: 'edge', id: 'e-iter010-files-q4', source: 'f-iter010-files', target: 'q-composer-input', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter010-files', severity: 'P1', label: 'files.searchPaths debounce 120ms, cache 20, cap 16, generation bump' },
      { id: 'f-iter010-ask', severity: 'P1', label: 'AskUserQuestion wizard sends option indices not labels' },
      { id: 'f-iter010-stack', severity: 'P2', label: 'Ask > permission > heuristic question; one overlay' },
    ],
    ruledOutLines: [{ direction: 'Device FS listing for @', reason: 'Fail-closed host search only' }],
  }),
  rec(11, {
    newInfoRatio: 0.76,
    focus: 'Permission overlay heuristic TUI vs structured approval',
    findingsCount: 3,
    noveltyJustification: 'First pass on permission heuristic vs envelope; distinct from AskUserQuestion wizard.',
    keyQuestions: ['q-session-chat-nav'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Client-side regex over last assistant bubble as approval truth', reason: 'No structured permission event; false positives send unsolicited TUI keys', evidence: 'specs/context/orca-main/mobile/src/session/mobile-native-chat-permission.ts:1:15' }],
    graphEvents: [
      { type: 'node', id: 'f-iter011-heur', kind: 'FINDING', label: 'Permission cards often parsed from TUI text' },
      { type: 'edge', id: 'e-iter011-heur-q5', source: 'f-iter011-heur', target: 'q-session-chat-nav', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter011-heur', severity: 'P1', label: 'Heuristic TUI permission parse is not portable; chrome over host tickets is' },
      { id: 'f-iter011-status', severity: 'P1', label: 'interactivePrompt approval envelope is the reliable host signal' },
      { id: 'f-iter011-pause', severity: 'P2', label: 'Never answer a working agent; paused states only' },
    ],
    ruledOutLines: [{ direction: 'Regex last-assistant as approval', reason: 'Fail-closed host tickets only' }],
  }),
  rec(12, {
    newInfoRatio: 0.70,
    focus: 'Electron prompt-history vs mobile composer',
    findingsCount: 3,
    noveltyJustification: 'First Electron-vs-mobile composer delta; locates prompt history as desktop-only local stack.',
    keyQuestions: ['q-composer-input'],
    answeredQuestions: ['q-composer-input'],
    ruledOut: [{ approach: 'Treat mobile native-chat as the source for up-arrow prompt history', reason: 'Mobile has no HistoryState; ArrowUp is Send', evidence: 'specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts:183:211' }],
    graphEvents: [
      { type: 'node', id: 'f-iter012-hist', kind: 'FINDING', label: 'Electron local sent-stack; mobile has none' },
      { type: 'edge', id: 'e-iter012-hist-q4', source: 'f-iter012-hist', target: 'q-composer-input', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter012-hist', severity: 'P1', label: 'Electron ArrowUp recalls client-local sent strings; not a host RPC' },
      { id: 'f-iter012-mobile', severity: 'P1', label: 'Mobile native-chat has no prompt-history stack' },
      { id: 'f-iter012-delta', severity: 'P2', label: 'Desktop $ skills and Escape-interrupt; mobile has mic/image' },
    ],
    ruledOutLines: [{ direction: 'Host prompt-history field', reason: 'Local sent-stack is enough' }],
  }),
  rec(13, {
    newInfoRatio: 0.64,
    focus: 'Copy-code editor fence button vs chat whole-message copy',
    findingsCount: 3,
    noveltyJustification: 'Distinguishes editor fence-copy from chat message-copy; answers the copy-code gap.',
    keyQuestions: ['q-message-level-chat'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Treat orca native-chat as having per-fence copy-code', reason: 'Chat copies whole-message prose; fence copy is the editor widget', evidence: 'specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatCopyButton.tsx:6:12' }],
    graphEvents: [
      { type: 'node', id: 'f-iter013-fence', kind: 'FINDING', label: 'Per-fence copy is editor not native-chat' },
      { type: 'edge', id: 'e-iter013-fence-q3', source: 'f-iter013-fence', target: 'q-message-level-chat', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter013-msg', severity: 'P2', label: 'Native-chat copy is whole-message prose' },
      { id: 'f-iter013-fence', severity: 'P1', label: 'CodeBlockCopyButton is editor; portable into chat markdown as view chrome' },
      { id: 'f-iter013-md', severity: 'P2', label: 'MobileMarkdown has path taps and mermaid, no copy-fence' },
    ],
    ruledOutLines: [{ direction: 'Native-chat already copies fences', reason: 'It copies whole messages' }],
  }),
  rec(14, {
    newInfoRatio: 0.58,
    focus: 'In-chat conversation actions rename pin archive export new',
    findingsCount: 3,
    noveltyJustification: 'Confirms absence of in-chat action chrome; CLI verbs vs UI; New Workspace vs New session.',
    keyQuestions: ['q-home-parallel-sessions', 'q-composer-input'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Porting an orca native-chat overflow menu for rename/archive', reason: 'No such menu; Electron context menu copies pane ids', evidence: 'specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:60:80' }],
    graphEvents: [
      { type: 'node', id: 'f-iter014-slash', kind: 'FINDING', label: 'Rename/archive/new are Codex CLI catalog strings' },
      { type: 'edge', id: 'e-iter014-slash-q1', source: 'f-iter014-slash', target: 'q-home-parallel-sessions', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter014-slash', severity: 'P1', label: 'Rename/archive/new/fork are CLI strings not in-app metadata APIs' },
      { id: 'f-iter014-ui', severity: 'P1', label: 'No in-chat overflow menu for those verbs' },
      { id: 'f-iter014-new', severity: 'P1', label: 'New Workspace is not New Chat' },
    ],
    ruledOutLines: [{ direction: 'Client-owned pin/archive store', reason: 'Not host-authoritative' }],
  }),
  rec(15, {
    newInfoRatio: 0.61,
    focus: 'History/home empty loading error stale decay timeAgo',
    findingsCount: 4,
    noveltyJustification: 'Screen-kind machine, shared empty copy, 30min decay, no live tick.',
    keyQuestions: ['q-home-parallel-sessions', 'q-session-chat-nav'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Copying skeleton-card loading from orca history', reason: 'History uses ActivityIndicator and keep-last-good', evidence: 'specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:273:290' }],
    graphEvents: [
      { type: 'node', id: 'f-iter015-screen', kind: 'FINDING', label: 'Four-kind history screen keep-last-good' },
      { type: 'edge', id: 'e-iter015-screen-q1', source: 'f-iter015-screen', target: 'q-home-parallel-sessions', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter015-screen', severity: 'P1', label: 'loading|error|capability-missing|ready; keep last good on refetch' },
      { id: 'f-iter015-chat', severity: 'P2', label: 'Shared empty/loading/error copy; error ≠ start a chat' },
      { id: 'f-iter015-stale', severity: 'P1', label: 'Active dots decay to idle after 30 minutes' },
      { id: 'f-iter015-time', severity: 'P2', label: 'formatTimeAgo has no live tick in history' },
    ],
    ruledOutLines: [{ direction: 'Skeleton cards as orca port', reason: 'Spinner plus keep-last-good' }],
  }),
  rec(16, {
    newInfoRatio: 0.67,
    focus: 'Session-option pickers vs our model/effort sheet',
    findingsCount: 4,
    noveltyJustification: 'First pass on session-option authority; slash-to-TUI is the wrong port.',
    keyQuestions: ['q-composer-input'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Replacing set_model RPCs with orca slash-to-TUI option catalog', reason: 'Options are composed CLI strings to a terminal agent', evidence: 'specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:210:256' }],
    graphEvents: [
      { type: 'node', id: 'f-iter016-slash', kind: 'FINDING', label: 'Option rows dispatch TUI commands not a host options API' },
      { type: 'edge', id: 'e-iter016-slash-q4', source: 'f-iter016-slash', target: 'q-composer-input', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter016-slash', severity: 'P1', label: 'Session option rows type slash into the agent TUI' },
      { id: 'f-iter016-report', severity: 'P1', label: 'Reported model is authority; identical re-reports must not revert picks' },
      { id: 'f-iter016-flip', severity: 'P1', label: 'Flip-only options fail-closed without a known baseline' },
    ],
    ruledOutLines: [{ direction: 'Replace set_model with TUI slash options', reason: 'Wrong authority for Pi RPC' }],
  }),
  rec(17, {
    newInfoRatio: 0.55,
    focus: 'Haptics taxonomy; swipe long-press multi-select absence',
    findingsCount: 3,
    noveltyJustification: 'Full haptic table plus confirmed absence of swipe/multi-select on history cards.',
    keyQuestions: ['q-home-parallel-sessions'],
    answeredQuestions: [],
    ruledOut: [{ approach: 'Copying iOS Mail-style swipe on session cards from orca', reason: 'History is SectionList plus PTR; no Swipeable', evidence: 'specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:1:2' }],
    graphEvents: [
      { type: 'node', id: 'f-iter017-haptic', kind: 'FINDING', label: 'Five named haptic helpers; Android avoids VIBRATE' },
      { type: 'edge', id: 'e-iter017-haptic-q1', source: 'f-iter017-haptic', target: 'q-home-parallel-sessions', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter017-haptic', severity: 'P2', label: 'Five haptic helpers; Android performAndroidHapticsAsync' },
      { id: 'f-iter017-swipe', severity: 'P1', label: 'No swipe, multi-select, or long-press menu on history cards' },
    ],
    ruledOutLines: [{ direction: 'Swipe-to-pin from orca history', reason: 'Gesture absent' }],
  }),
  rec(18, {
    newInfoRatio: 0.48,
    focus: 'Frozen host-field request bundle vs opaque-identifier product rule',
    findingsCount: 4,
    noveltyJustification: 'Synthesis of the request bundle and product-rule split; high decision value.',
    keyQuestions: ['q-card-content-model', 'q-home-parallel-sessions'],
    answeredQuestions: ['q-card-content-model'],
    ruledOut: [{ approach: 'Shipping path/cwd on the home card under current product copy', reason: 'Opaque-id policy allows title projection, not filesystem paths', evidence: 'app-mobile/src/pages/home/screen-home.svelte:94:108' }],
    graphEvents: [
      { type: 'node', id: 'f-iter018-min', kind: 'FINDING', label: 'Minimum home bundle title preview agent attention' },
      { type: 'edge', id: 'e-iter018-min-q2', source: 'f-iter018-min', target: 'q-card-content-model', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter018-min', severity: 'P0', label: 'Request title, lastMessagePreview, agent, attention on SessionCardDto' },
      { id: 'f-iter018-opt', severity: 'P2', label: 'projectLabel/pin/previewMessages are optional product decisions' },
      { id: 'f-iter018-chat', severity: 'P1', label: 'Chat RPCs (file search, image lease) are distinct from the card DTO' },
      { id: 'f-iter018-rule', severity: 'P1', label: 'title is compatible with opaque ids; raw cwd on home is not' },
    ],
    ruledOutLines: [{ direction: 'Derive title from compact id', reason: 'False drop-in' }],
  }),
  rec(19, {
    newInfoRatio: 0.42,
    focus: 'Electron unread join vs Inbox; home needs-you without a new field',
    findingsCount: 3,
    noveltyJustification: 'Inbox-join path may avoid an attention field; unread≠working restated as a hard rule.',
    keyQuestions: ['q-home-parallel-sessions'],
    answeredQuestions: ['q-home-parallel-sessions'],
    ruledOut: [{ approach: 'Treating status=running as unread', reason: 'Orca unread is done/blocked/waiting', evidence: 'iter 3 useActivityUnreadCount' }],
    graphEvents: [
      { type: 'node', id: 'f-iter019-join', kind: 'FINDING', label: 'Home unread can join Inbox tickets onto session ids' },
      { type: 'edge', id: 'e-iter019-join-q1', source: 'f-iter019-join', target: 'q-home-parallel-sessions', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter019-join', severity: 'P1', label: 'Badge via Inbox join if sessionId present; else attention field' },
      { id: 'f-iter019-unread', severity: 'P1', label: 'Unread ≠ working' },
      { id: 'f-iter019-history', severity: 'P1', label: 'Agent History is the analog for our home, not Orca Home' },
    ],
    ruledOutLines: [{ direction: 'Copy Orca Home worktree chrome onto Pi cards', reason: 'Wrong object' }],
  }),
  rec(20, {
    newInfoRatio: 0.22,
    focus: 'Gap audit vs research-angles.md coverage close-out',
    findingsCount: 3,
    noveltyJustification: 'Coverage matrix of every listed chat/home gap; little new file evidence; final iteration under max-iterations.',
    keyQuestions: ['q-home-parallel-sessions', 'q-card-content-model', 'q-message-level-chat', 'q-composer-input', 'q-session-chat-nav'],
    answeredQuestions: ['q-home-parallel-sessions', 'q-card-content-model', 'q-message-level-chat', 'q-composer-input', 'q-session-chat-nav'],
    ruledOut: [{ approach: 'Further mining of orca PR sidebar/git history as session-selection sources', reason: 'Wrong object relative to ranked angles', evidence: 'specs/007-orca-ux-mining/research-angles.md:15:24' }],
    graphEvents: [
      { type: 'node', id: 'f-iter020-audit', kind: 'FINDING', label: 'Complete gap-by-verdict audit of research-angles.md' },
      { type: 'edge', id: 'e-iter020-audit-q1', source: 'f-iter020-audit', target: 'q-home-parallel-sessions', relation: 'ANSWERS' },
      { type: 'edge', id: 'e-iter020-audit-q3', source: 'f-iter020-audit', target: 'q-message-level-chat', relation: 'ANSWERS' },
    ],
    findings: [
      { id: 'f-iter020-chat', severity: 'P1', label: 'Chat-gap audit: menus absent in orca; copy/nav/haptics/@ portable with caveats' },
      { id: 'f-iter020-home', severity: 'P1', label: 'Home-gap audit: History analog; worktree Home ruled out' },
      { id: 'f-iter020-open', severity: 'P2', label: 'Residual questions are product/host not missing orca files' },
    ],
    ruledOutLines: [{ direction: 'Wait for orca ChatGPT-style message menus', reason: 'Not present at this orca version' }],
  }),
];

for (const row of iters) {
  const n = String(row.iteration).padStart(3, '0');
  const { findings, ruledOutLines, ...gateway } = row;
  const gatewayPath = path.join(ROOT, '_gateway', `iter-${n}.json`);
  fs.writeFileSync(gatewayPath, `${JSON.stringify(gateway, null, 2)}\n`);
  const lines = [JSON.stringify(gateway)];
  for (const f of findings || []) {
    lines.push(JSON.stringify({ type: 'finding', id: f.id, severity: f.severity, label: f.label, iteration: row.iteration }));
  }
  for (const r of ruledOutLines || []) {
    lines.push(JSON.stringify({ type: 'ruled_out', direction: r.direction, reason: r.reason, iteration: row.iteration }));
  }
  fs.writeFileSync(path.join(ROOT, 'deltas', `iter-${n}.jsonl`), `${lines.join('\n')}\n`);
}

process.stdout.write(`wrote ${iters.length} gateway+delta pairs under ${ROOT}\n`);
