<script lang="ts">
  // The global stylesheet: the frozen foundation (@theme, @font-face, the three data-theme token
  // blocks, resets) plus — during the migration — the not-yet-decomposed component rules. As each
  // component moves its @ds surface block into its own scoped <style>, this file shrinks toward the
  // pure foundation (app.css).
  import '../style.css';

  let { children } = $props();
</script>

{@render children()}
