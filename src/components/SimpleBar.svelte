<script>
	import { onMount } from "svelte";
	import SimpleBar from "simplebar";
	import "simplebar/dist/simplebar.css";

	export let maxHeight = "300px";
	let container;
	let instance;

	onMount(() => {
		instance = new SimpleBar(container);
		return () => instance?.unMount();
	});
</script>

<div data-simplebar style="max-height: {maxHeight}" bind:this={container}>
	<slot />
</div>

<style global>
	.simplebar-track {
		right: -10px;
	}
</style>
