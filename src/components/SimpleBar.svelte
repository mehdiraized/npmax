<script>
	import { onMount } from "svelte";
	import SimpleBar from "simplebar";
	import "simplebar/dist/simplebar.css";

	let { maxHeight = "300px", children } = $props();
	let container = $state();

	onMount(() => {
		new SimpleBar(container);
	});
</script>

<div style="max-height: {maxHeight}" bind:this={container}>
	<div class="simplebar-wrapper">
		<div class="simplebar-height-auto-observer-wrapper">
			<div class="simplebar-height-auto-observer"></div>
		</div>
		<div class="simplebar-mask">
			<div class="simplebar-offset">
				<div class="simplebar-content-wrapper">
					<div class="simplebar-content">
						{@render children?.()}
					</div>
				</div>
			</div>
		</div>
		<div class="simplebar-placeholder"></div>
	</div>
	<div class="simplebar-track simplebar-horizontal">
		<div class="simplebar-scrollbar"></div>
	</div>
	<div class="simplebar-track simplebar-vertical">
		<div class="simplebar-scrollbar"></div>
	</div>
</div>

<style global>
	.simplebar-track {
		right: -10px;
	}
</style>
