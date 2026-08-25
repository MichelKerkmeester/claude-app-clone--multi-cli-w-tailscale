<script lang="ts">
  // @ds route: /session/[id] — one live session.
  import { page } from '$app/stores';

  import { getAppState, getAppActions } from '$shared/state/app-state.svelte.js';
  import Session from '../../../pages/chat/screen-chat.svelte';

  const app = getAppState();
  const actions = getAppActions();

  const sessionId = $derived($page.params.id!);
  const status = $derived(
    app.sessions.items.find((session) => session.id === sessionId)?.status ?? 'unknown',
  );
</script>

<Session
  connection={app.connection.phase}
  {sessionId}
  initialCache={app.initialCache}
  transcript={app.transcript}
  todoProjection={app.todoProjection}
  dispatchConnection={app.dispatchConnection}
  dispatchTranscript={app.dispatchTranscript}
  dispatchTodoProjection={app.dispatchTodoProjection}
  {status}
  onBack={() => actions.navigate(null)}
  onInbox={actions.openInbox}
  onReview={actions.openReview}
  theme={app.theme}
  onThemeChange={(value) => (app.theme = value)}
  mediaCapability={app.mediaCapability}
  askQuestionPrincipal={app.askQuestionPrincipal}
/>
