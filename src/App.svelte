<script>
	import Sidebar from "./components/sidebar.svelte";
	import Main from "./components/main.svelte";
</script>

<div class="app">
	<Sidebar />
	<Main />
</div>

<style lang="scss">
	.app {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: row;
		align-items: stretch;
		overflow: hidden;
		position: relative;
	}
</style>
