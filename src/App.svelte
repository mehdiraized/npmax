<script>
	import Sidebar from "./components/sidebar.svelte";
	import Main from "./components/main.svelte";
</script>

<main class="main">
	<Sidebar />
	<Main />
</main>

<style type="text/scss">
	.main {
		min-height: 100vh;
		height: 100%;
		display: flex;
		overflow: hidden;
		flex-direction: row;
		align-items: stretch;
	}
</style>
