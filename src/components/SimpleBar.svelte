<script>
	import { onMount } from "svelte";
	import SimpleBar from "simplebar";
	import "simplebar/dist/simplebar.css";

	export let maxHeight = "300px";
	let container;

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
						<slot />
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
