<script>
	import { onDestroy, onMount } from "svelte";
	import { blur } from "svelte/transition";
	import { Toaster } from "svelte-sonner";
	import SimpleBar from "../components/SimpleBar.svelte";
	import PackageEditor from "../components/PackageEditor.svelte";
	import ComposerEditor from "../components/ComposerEditor.svelte";
	import { projects, menuActive } from "../store";
	import {
		openDirectory,
		getProjectPackages,
		getProjectComposerPackages,
	} from "../utils/shell.js";

	let currentProjectID = $state(false);
	let currentProject = $state(undefined);
	let rawJson = $state("");
	let projectType = $state("npm"); // "npm" | "composer"
	let loading = $state(false);

	// Track menuActive and projects reactively (Svelte 5 pattern)
	$effect(() => {
		const value = $menuActive;
		currentProjectID = value ? value.split("_")[1] : false;
		const found = $projects.find(
			(item) => item.id === parseInt(currentProjectID),
		);
		currentProject = found;

		if (found) {
			loadProject(found.path);
		} else {
			rawJson = "";
			loading = false;
		}
	});

	async function loadProject(projectPath) {
		loading = true;
		try {
			// Try composer.json first; fall back to package.json
			try {
				rawJson = await getProjectComposerPackages(projectPath);
				projectType = "composer";
			} catch {
				rawJson = await getProjectPackages(projectPath);
				projectType = "npm";
			}
		} catch {
			rawJson = "";
		}
		loading = false;
	}

	async function addProject() {
		try {
			const result = await openDirectory();
			if (result.length > 0) {
				const projectPath = result[0];
				const parts = result[0].split("/");
				const projectName = parts[parts.length - 1];
				projects.update((list) => {
					const newId = list.length > 0 ? list[list.length - 1].id + 1 : 0;
					return [...list, { id: newId, name: projectName, path: projectPath }];
				});
				localStorage.setItem("projects", JSON.stringify($projects));
			}
		} catch (err) {
			console.error(err);
		}
	}

	function handleRefresh(newRaw) {
		rawJson = newRaw;
	}

	function reloadCurrentProject() {
		if (currentProject?.path) {
			loadProject(currentProject.path);
		}
	}

	onMount(() => {
		window.addEventListener(
			"npmax:reload-current-project",
			reloadCurrentProject,
		);
	});

	onDestroy(() => {
		window.removeEventListener(
			"npmax:reload-current-project",
			reloadCurrentProject,
		);
	});
</script>

<div class="content">
	<SimpleBar maxHeight={"calc(100vh)"}>
		{#if !currentProject}
			<section transition:blur={{ duration: 200 }} class="empty">
				<div class="empty__card">
					<img src="./images/add.png" alt="Add project" class="empty__img" />
					<h1 class="empty__title">No Project Selected</h1>
					<p class="empty__sub">
						Add a project to view and manage its packages.
					</p>
					<button class="empty__btn" onclick={addProject}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							xmlns="http://www.w3.org/2000/svg"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Add Project
					</button>
				</div>
			</section>
		{:else}
			{#key currentProjectID}
				<section transition:blur={{ duration: 200 }} class="pkgView">
					<header class="pkgView__header">
						<div class="pkgView__headerInner">
							<svg
								class="pkgView__headerIcon"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
								/>
							</svg>
							<h1 class="pkgView__title">{currentProject.name}</h1>
							{#if loading}
								<span class="pkgView__loadingDot"></span>
							{/if}
						</div>
					</header>

					{#if projectType === "composer"}
						<ComposerEditor
							project={currentProject}
							{rawJson}
							onRefresh={handleRefresh}
						/>
					{:else}
						<PackageEditor
							project={currentProject}
							{rawJson}
							onRefresh={handleRefresh}
						/>
					{/if}
				</section>
			{/key}
		{/if}
	</SimpleBar>
</div>
<Toaster position="bottom-center" theme="dark" richColors />

<style lang="scss">
	.content {
		flex: 1;
		min-width: 0;
		height: 100vh;
		background: var(--content-bg, rgba(12, 12, 22, 0.7));
		backdrop-filter: var(--blur-amount, blur(20px) saturate(180%));
		-webkit-backdrop-filter: var(--blur-amount, blur(20px) saturate(180%));
		border-left: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
	}

	.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 40px;
	}

	.empty__card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 48px 56px;
		border-radius: var(--radius-xl, 24px);
		background: var(--glass-light, rgba(255, 255, 255, 0.06));
		backdrop-filter: blur(16px) saturate(180%);
		-webkit-backdrop-filter: blur(16px) saturate(180%);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		box-shadow: var(--shadow-lg);
		text-align: center;
	}

	.empty__img {
		width: 160px;
		opacity: 0.7;
		filter: drop-shadow(0 8px 24px rgba(91, 156, 246, 0.25));
	}

	.empty__title {
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary, rgba(255, 255, 255, 0.92));
		letter-spacing: -0.3px;
	}

	.empty__sub {
		font-size: 13px;
		color: var(--text-secondary, rgba(255, 255, 255, 0.5));
		max-width: 260px;
		line-height: 1.5;
	}

	.empty__btn {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 22px;
		margin-top: 8px;
		border-radius: var(--radius-md, 13px);
		border: 1px solid rgba(91, 156, 246, 0.35);
		background: var(--accent-subtle, rgba(91, 156, 246, 0.12));
		color: var(--accent-hover, #7ab3ff);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-base, 0.25s ease);

		svg {
			width: 15px;
			height: 15px;
		}

		&:hover {
			background: rgba(91, 156, 246, 0.22);
			box-shadow: 0 0 20px var(--accent-glow, rgba(91, 156, 246, 0.3));
		}

		&:active {
			transform: scale(0.97);
		}
	}

	.pkgView {
		padding: 0;
	}

	.pkgView__header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 12px;
		background: var(--content-bg, rgba(12, 12, 22, 0.7));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		margin-bottom: 0;
		-webkit-app-region: drag;
	}

	.pkgView__headerInner {
		display: flex;
		align-items: center;
		gap: 10px;
		-webkit-app-region: none;
	}

	.pkgView__headerIcon {
		width: 20px;
		height: 20px;
		color: var(--accent, #5b9cf6);
		flex-shrink: 0;
	}

	.pkgView__title {
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.3px;
		color: var(--text-primary, rgba(255, 255, 255, 0.92));
	}

	.pkgView__loadingDot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent, #5b9cf6);
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
