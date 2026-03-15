<script>
	import { onDestroy, onMount } from "svelte";
	import SimpleBar from "../components/SimpleBar.svelte";
	import { projects, menuActive } from "../store";
	import { globalPackages, openDirectory } from "../utils/shell.js";
	import { isJson } from "../utils/index.js";
	import NpmIcon from "../icons/npm.svelte";
	import PnpmIcon from "../icons/pnpm.svelte";
	import YarnIcon from "../icons/yarn.svelte";
	import ComposerIcon from "../icons/composer.svelte";
	import SwiftIcon from "../icons/swift.svelte";
	import CocoaPodsIcon from "../icons/cocoapods.svelte";
	import GradleIcon from "../icons/gradle.svelte";
	import FlutterIcon from "../icons/flutter.svelte";
	import GoIcon from "../icons/go.svelte";
	import RustIcon from "../icons/rust.svelte";
	import RubyIcon from "../icons/ruby.svelte";

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

		window.addEventListener("npmax:add-project", addProject);
	});

	onDestroy(() => {
		window.removeEventListener("npmax:add-project", addProject);
	});

	async function addProject() {
		try {
			const result = await openDirectory();
			if (result.length > 0) {
				const projectPath = result[0];
				const projectPathArray = result[0].split("/");
				const projectName = projectPathArray[projectPathArray.length - 1];
				const newId =
					$projects.length > 0 ? $projects[$projects.length - 1].id + 1 : 0;
				projects.update((list) => {
					return [...list, { id: newId, name: projectName, path: projectPath }];
				});
				const nextProjects = [
					...$projects,
					{ id: newId, name: projectName, path: projectPath },
				];
				localStorage.setItem("projects", JSON.stringify(nextProjects));
				menuActive.set(`project_${newId}`);
			}
		} catch (err) {
			console.error(err);
		}
	}

	function closeProject(id) {
		if ($menuActive === `project_${id}`) {
			menuActive.set("installed-apps");
		}
	}

	function removeProject(id) {
		const filtered = $projects.filter((item) => item.id !== id);
		projects.set(filtered);
		menuActive.set("installed-apps");
		localStorage.setItem("projects", JSON.stringify(filtered));
	}
</script>

<aside class="sidebar">
	<div class="sidebar__pane">
		<div class="sidebar__titlebar"></div>

		<div class="sidebar__header">
			<div class="sidebar__brand">
				<div class="sidebar__brandMark">n</div>
				<div>
					<strong>npMax v3</strong>
					<span>Projects + installed apps</span>
				</div>
			</div>
		</div>

		<SimpleBar maxHeight={"calc(100vh - 168px)"}>
			<div class="sidebar__scroll-content">
				<section class="sidebarSection">
					<h2 class="sidebarSection__label">Overview</h2>
					<button
						class:navCard--active={$menuActive === "installed-apps"}
						class="navCard"
						onclick={() => menuActive.set("installed-apps")}
					>
						<div>
							<strong>Installed Apps</strong>
							<span>Scan the full machine and watch for new releases.</span>
						</div>
						<small>System</small>
					</button>
				</section>

				<section class="sidebarSection">
					<div class="sidebarSection__heading">
						<h2 class="sidebarSection__label">Projects</h2>
						<button class="sidebarSection__link" onclick={addProject}>Add</button>
					</div>

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

	{#if packages.npm || packages.yarn || packages.pnpm || packages.composer || packages.swift || packages.cocoapods || packages.gradle || packages.flutter || packages.go || packages.cargo || packages.bundler}
		<section class="sidebarSection sidebarSection--pkg">
			<h2 class="sidebarSection__label">Package Managers</h2>
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
			{#if packages.swift}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><SwiftIcon /></figure>
					<span class="pkgItem__name">swift</span>
					<span class="pkgItem__badge">{packages.swift.trim()}</span>
				</div>
			{/if}
			{#if packages.cocoapods}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><CocoaPodsIcon /></figure>
					<span class="pkgItem__name">cocoapods</span>
					<span class="pkgItem__badge">{packages.cocoapods.trim()}</span>
				</div>
			{/if}
			{#if packages.gradle}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><GradleIcon /></figure>
					<span class="pkgItem__name">gradle</span>
					<span class="pkgItem__badge">{packages.gradle.trim()}</span>
				</div>
			{/if}
			{#if packages.flutter}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><FlutterIcon /></figure>
					<span class="pkgItem__name">flutter</span>
					<span class="pkgItem__badge">{packages.flutter.trim()}</span>
				</div>
			{/if}
			{#if packages.go}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><GoIcon /></figure>
					<span class="pkgItem__name">go</span>
					<span class="pkgItem__badge">{packages.go.trim()}</span>
				</div>
			{/if}
			{#if packages.cargo}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><RustIcon /></figure>
					<span class="pkgItem__name">cargo</span>
					<span class="pkgItem__badge">{packages.cargo.trim()}</span>
				</div>
			{/if}
			{#if packages.bundler}
				<div class="pkgItem">
					<figure class="pkgItem__icon"><RubyIcon /></figure>
					<span class="pkgItem__name">bundler</span>
					<span class="pkgItem__badge">{packages.bundler.trim()}</span>
				</div>
			{/if}
		</section>
	{/if}
</aside>

<style lang="scss">
	.sidebar {
		width: 288px;
		min-width: 288px;
		height: 100vh;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)),
			radial-gradient(circle at top, rgba(120, 180, 255, 0.18), transparent 30%);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
	}

	.sidebar__pane,
	.sidebarSection--pkg {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: var(--blur-amount, blur(18px));
		-webkit-backdrop-filter: var(--blur-amount, blur(18px));
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
	}

	.sidebar__pane {
		flex: 1;
		min-height: 0;
		padding: 8px;
		display: flex;
		flex-direction: column;
	}

	.sidebar__titlebar {
		height: 26px;
		-webkit-app-region: drag;
	}

	.sidebar__header {
		padding: 6px 10px 10px;
	}

	.sidebar__brand {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.sidebar__brandMark {
		width: 38px;
		height: 38px;
		border-radius: 14px;
		display: grid;
		place-items: center;
		font-size: 20px;
		font-weight: 800;
		background: linear-gradient(135deg, rgba(120, 180, 255, 0.9), rgba(88, 216, 194, 0.85));
		color: #07131f;
	}

	.sidebar__brand span,
	.sidebarSection__empty {
		color: var(--text-secondary);
	}

	.sidebar__scroll-content {
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.sidebarSection__heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	.sidebarSection__label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.sidebarSection__link {
		background: transparent;
		border: 0;
		color: #8fc4ff;
		font-size: 12px;
	}

	.navCard,
	.projectItem,
	.pkgItem,
	.sidebar__addBtn {
		border-radius: 16px;
	}

	.navCard {
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		padding: 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		color: var(--text-primary);
	}

	.navCard span,
	.navCard small {
		color: var(--text-secondary);
	}

	.navCard--active {
		background: linear-gradient(180deg, rgba(120, 180, 255, 0.16), rgba(88, 216, 194, 0.12));
		border-color: rgba(120, 180, 255, 0.26);
	}

	.projectItem {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 6px;
		padding: 4px;
		border: 1px solid transparent;
	}

	.projectItem--active {
		background: rgba(120, 180, 255, 0.1);
		border-color: rgba(120, 180, 255, 0.2);
	}

	.projectItem__btn,
	.projectItem__remove,
	.projectItem__close,
	.sidebar__addBtn {
		border: 0;
		background: transparent;
		color: var(--text-primary);
	}

	.projectItem__btn {
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.projectItem__icon {
		width: 16px;
		height: 16px;
		color: #9bd0ff;
		flex: 0 0 auto;
	}

	.projectItem__name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.projectItem__remove,
	.projectItem__close {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		color: var(--text-secondary);
	}

	.sidebar__addBtn {
		margin-top: 12px;
		padding: 13px 16px;
		background: rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.sidebarSection--pkg {
		padding: 14px 12px;
	}

	.pkgItem {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.03);
		margin-bottom: 6px;
	}

	.pkgItem__icon {
		width: 18px;
		height: 18px;
		display: grid;
		place-items: center;
	}

	.pkgItem__name {
		flex: 1;
		min-width: 0;
	}

	.pkgItem__badge {
		font-size: 11px;
		color: var(--text-secondary);
	}
</style>
