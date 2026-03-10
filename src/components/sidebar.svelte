<script>
	import { onMount } from "svelte";
	import SimpleBar from "../components/SimpleBar.svelte";
	import { projects, menuActive } from "../store";
	import { globalPackages, openDirectory } from "../utils/shell.js";
	import { isJson } from "../utils/index.js";
	import NpmIcon from "../icons/npm.svelte";
	import PnpmIcon from "../icons/pnpm.svelte";
	import YarnIcon from "../icons/yarn.svelte";
	import ComposerIcon from "../icons/composer.svelte";

	let packages = $state({});

	onMount(async () => {
		packages = isJson(localStorage.getItem("packages"))
			? JSON.parse(localStorage.getItem("packages"))
			: {};
		projects.set(
			localStorage.getItem("projects") !== "null"
				? JSON.parse(localStorage.getItem("projects") || "[]")
				: [],
		);
		packages = await globalPackages();
		localStorage.setItem("packages", JSON.stringify(packages));
	});

	async function addProject() {
		try {
			const result = await openDirectory();
			if (result.length > 0) {
				const projectPath = result[0];
				const projectPathArray = result[0].split("/");
				const projectName = projectPathArray[projectPathArray.length - 1];
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

	function closeProject(id) {
		if ($menuActive === `project_${id}`) {
			menuActive.set(null);
		}
	}

	function removeProject(id) {
		const filtered = $projects.filter((item) => item.id !== id);
		projects.set(filtered);
		menuActive.set(null);
		localStorage.setItem("projects", JSON.stringify(filtered));
	}
</script>

<aside class="sidebar">
	<div>
		<!-- Drag region at the top (macOS traffic lights area) -->
		<div class="sidebar__titlebar"></div>

		<SimpleBar maxHeight={"calc(100vh - 120px)"}>
			<div class="sidebar__scroll-content">
				<section class="sidebarSection">
					<h2 class="sidebarSection__label">Projects</h2>

					{#if $projects && $projects.length > 0}
						{#each $projects as { id, name }}
							<div
								class="projectItem"
								class:projectItem--active={$menuActive === `project_${id}`}
							>
								<button
									class="projectItem__btn"
									onclick={() => menuActive.set(`project_${id}`)}
								>
									<svg
										class="projectItem__icon"
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
									<span class="projectItem__name">{name}</span>
								</button>
								<button
									class="projectItem__remove"
									aria-label="Remove project"
									onclick={() => removeProject(id)}
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										xmlns="http://www.w3.org/2000/svg"
									>
										<polyline points="3 6 5 6 21 6" />
										<path
											d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
										/>
										<line x1="10" y1="11" x2="10" y2="17" />
										<line x1="14" y1="11" x2="14" y2="17" />
									</svg>
								</button>
								<button
									class="projectItem__close"
									aria-label="Close project"
									onclick={() => closeProject(id)}
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										xmlns="http://www.w3.org/2000/svg"
									>
										<line x1="18" x2="6" y1="6" y2="18" />
										<line x1="6" x2="18" y1="6" y2="18" />
									</svg>
								</button>
							</div>
						{/each}
					{:else}
						<p class="sidebarSection__empty">No projects yet</p>
					{/if}
				</section>
			</div>
		</SimpleBar>

		<button class="sidebar__addBtn" onclick={addProject}>
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
	<!-- Global package managers -->
	{#if packages.npm || packages.yarn || packages.pnpm || packages.composer}
		<section
			class="sidebarSection"
			style="padding-left: 8px;padding-right: 8px; padding-bottom: 8px;"
		>
			<h2 class="sidebarSection__label" style="text-align: center;">
				Package Managers
			</h2>
			{#if packages.npm}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><NpmIcon /></figure>
					<span class="pkgItem__name">npm</span>
					<span class="pkgItem__badge">{packages.npm.trim()}</span>
				</div>
			{/if}
			{#if packages.yarn}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><YarnIcon /></figure>
					<span class="pkgItem__name">yarn</span>
					<span class="pkgItem__badge">{packages.yarn.trim()}</span>
				</div>
			{/if}
			{#if packages.pnpm}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><PnpmIcon /></figure>
					<span class="pkgItem__name">pnpm</span>
					<span class="pkgItem__badge">{packages.pnpm.trim()}</span>
				</div>
			{/if}
			{#if packages.composer}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><ComposerIcon /></figure>
					<span class="pkgItem__name">composer</span>
					<span class="pkgItem__badge">{packages.composer.trim()}</span>
				</div>
			{/if}
		</section>
	{/if}
</aside>

<style lang="scss">
	.sidebar {
		width: var(--sidebar-width, 240px);
		min-width: var(--sidebar-width, 240px);
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: stretch;
		position: sticky;
		top: 0;
		overflow: hidden;

		background: var(--sidebar-bg, rgba(255, 255, 255, 0.06));
		backdrop-filter: var(--blur-amount, blur(24px) saturate(180%));
		-webkit-backdrop-filter: var(--blur-amount, blur(24px) saturate(180%));
		border-right: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		box-shadow:
			1px 0 0 rgba(255, 255, 255, 0.06),
			var(--shadow-md);

		-webkit-app-region: drag;
	}

	.sidebar__titlebar {
		height: var(--titlebar-height, 44px);
		min-height: var(--titlebar-height, 44px);
		-webkit-app-region: drag;
		flex-shrink: 0;
	}

	.sidebar__scroll-content {
		padding: 4px 10px 8px;
		-webkit-app-region: none;
	}

	.sidebarSection {
	}

	.sidebarSection__label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.7px;
		text-transform: uppercase;
		color: var(--text-muted, rgba(255, 255, 255, 0.28));
		padding: 0 8px;
		margin-bottom: 6px;
		line-height: 1;
	}

	.sidebarSection__empty {
		font-size: 12px;
		color: var(--text-muted, rgba(255, 255, 255, 0.28));
		padding: 6px 8px;
	}

	.pkgItem {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: var(--radius-sm, 9px);
		color: var(--text-secondary, rgba(255, 255, 255, 0.55));
		font-size: 13px;
		height: 32px;
	}

	.pkgItem__icon {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		fill: var(--text-secondary, rgba(255, 255, 255, 0.55));
		line-height: 0;
	}

	.pkgItem__name {
		flex: 1;
		font-weight: 500;
	}

	.pkgItem__badge {
		font-size: 11px;
		font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
		color: var(--text-muted, rgba(255, 255, 255, 0.28));
		background: rgba(255, 255, 255, 0.08);
		padding: 2px 7px;
		border-radius: 99px;
		letter-spacing: 0.3px;
	}

	.projectItem {
		display: flex;
		align-items: center;
		border-radius: var(--radius-sm, 9px);
		margin-bottom: 2px;
		gap: 5px;
		height: 34px;
		transition: background var(--transition-fast, 0.15s ease);
		-webkit-app-region: none;
		overflow: hidden;

		&:hover {
			background: rgba(255, 255, 255, 0.06);

			.projectItem__remove,
			.projectItem__close {
				opacity: 1;
			}
		}

		&.projectItem--active {
			background: rgba(255, 255, 255, 0.1);
			box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);

			.projectItem__icon {
				color: var(--accent, #5b9cf6);
			}

			.projectItem__name {
				color: var(--text-primary, rgba(255, 255, 255, 0.92));
				font-weight: 500;
			}

			.projectItem__remove,
			.projectItem__close {
				opacity: 1;
			}
		}
	}

	.projectItem__btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		height: 100%;
		padding: 0 8px;
		background: none;
		border: none;
		color: var(--text-secondary, rgba(255, 255, 255, 0.55));
		font-size: 13px;
		text-align: left;
		cursor: pointer;
		min-width: 0;
		transition: color var(--transition-fast, 0.15s ease);

		&:hover {
			color: var(--text-primary, rgba(255, 255, 255, 0.92));
		}
	}

	.projectItem__icon {
		flex-shrink: 0;
		width: 15px;
		height: 15px;
		color: var(--text-muted, rgba(255, 255, 255, 0.28));
		transition: color var(--transition-fast, 0.15s ease);
	}

	.projectItem__name {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 400;
	}

	.projectItem__close {
		flex-shrink: 0;
		opacity: 0;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-secondary, rgba(255, 255, 255, 0.55));
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			opacity var(--transition-fast, 0.15s ease),
			background var(--transition-fast, 0.15s ease);

		svg {
			width: 12px;
			height: 12px;
			stroke-width: 2.5;
		}

		&:hover {
			background: rgba(255, 255, 255, 0.2);
			color: var(--text-primary, rgba(255, 255, 255, 0.92));
		}
	}

	.projectItem__remove {
		flex-shrink: 0;
		opacity: 0;
		width: 22px;
		height: 22px;
		margin-right: 6px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 80, 80, 0.15);
		color: var(--danger, rgba(255, 80, 80, 0.85));
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			opacity var(--transition-fast, 0.15s ease),
			background var(--transition-fast, 0.15s ease);

		svg {
			width: 12px;
			height: 12px;
			stroke-width: 2.5;
		}

		&:hover {
			background: rgba(255, 80, 80, 0.3);
		}
	}

	.sidebar__addBtn {
		width: calc(100% - 20px);
		-webkit-app-region: none;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		margin: 0 10px 14px;
		padding: 9px 14px;
		border-radius: var(--radius-md, 13px);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		background: var(--glass-light, rgba(255, 255, 255, 0.07));
		color: var(--text-secondary, rgba(255, 255, 255, 0.55));
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background var(--transition-base, 0.25s ease),
			color var(--transition-base, 0.25s ease),
			border-color var(--transition-base, 0.25s ease),
			box-shadow var(--transition-base, 0.25s ease);

		svg {
			width: 14px;
			height: 14px;
			flex-shrink: 0;
		}

		&:hover {
			background: var(--accent-subtle, rgba(91, 156, 246, 0.12));
			color: var(--accent-hover, #7ab3ff);
			border-color: rgba(91, 156, 246, 0.3);
			box-shadow: 0 0 14px var(--accent-glow, rgba(91, 156, 246, 0.2));
		}

		&:active {
			transform: scale(0.97);
		}
	}
</style>
