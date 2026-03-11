<script>
	import { onDestroy, onMount } from "svelte";
	import Sidebar from "./components/sidebar.svelte";
	import Main from "./components/main.svelte";
	import UpdateNotification from "./components/UpdateNotification.svelte";

	const { ipcRenderer } = require("electron");

	const relayMenuAddProject = () => {
		window.dispatchEvent(new CustomEvent("npmax:add-project"));
	};

	const relayMenuReloadCurrentProject = () => {
		window.dispatchEvent(new CustomEvent("npmax:reload-current-project"));
	};

	onMount(() => {
		ipcRenderer.on("menu-add-project", relayMenuAddProject);
		ipcRenderer.on(
			"menu-reload-current-project",
			relayMenuReloadCurrentProject,
		);
	});

	onDestroy(() => {
		ipcRenderer.removeListener("menu-add-project", relayMenuAddProject);
		ipcRenderer.removeListener(
			"menu-reload-current-project",
			relayMenuReloadCurrentProject,
		);
	});
</script>

<div class="app">
	<Sidebar />
	<Main />
	<UpdateNotification />
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
