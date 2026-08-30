<script lang="ts">
  import ToggleGroup from '../../src/shared/primitives/choice/toggle-group.svelte';
  import ToggleGroupItem from '../../src/shared/primitives/choice/toggle-group-item.svelte';

  let value = $state('build');
</script>

<ToggleGroup bind:value aria-label="Build mode">
  <ToggleGroupItem value="build">Build</ToggleGroupItem>
  <ToggleGroupItem value="plan">Plan</ToggleGroupItem>
</ToggleGroup>
