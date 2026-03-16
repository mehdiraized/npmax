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

	const pkgDefs = [
		{ key: "npm", label: "npm", Icon: NpmIcon },
		{ key: "yarn", label: "yarn", Icon: YarnIcon },
		{ key: "pnpm", label: "pnpm", Icon: PnpmIcon },
		{ key: "composer", label: "composer", Icon: ComposerIcon },
		{ key: "swift", label: "swift", Icon: SwiftIcon },
		{ key: "cocoapods", label: "cocoapods", Icon: CocoaPodsIcon },
		{ key: "gradle", label: "gradle", Icon: GradleIcon },
		{ key: "flutter", label: "flutter", Icon: FlutterIcon },
		{ key: "go", label: "go", Icon: GoIcon },
		{ key: "cargo", label: "cargo", Icon: RustIcon },
		{ key: "bundler", label: "bundler", Icon: RubyIcon },
	];

	const activePkgs = $derived(pkgDefs.filter((p) => !!packages[p.key]));

	onMount(async () => {
		packages = isJson(localStorage.getItem("packages"))
			? JSON.parse(localStorage.getItem("packages"))
			: {};
		const storedProjects =
			localStorage.getItem("projects") !== "null"
				? JSON.parse(localStorage.getItem("projects") || "[]")
				: [];
		projects.set(storedProjects);
		if (
			$menuActive !== "installed-apps" &&
			!storedProjects.some(({ id }) => `project_${id}` === $menuActive)
		) {
			menuActive.set("installed-apps");
		}
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
				const parts = result[0].split("/");
				const projectName = parts[parts.length - 1];
				const newId =
					$projects.length > 0 ? $projects[$projects.length - 1].id + 1 : 0;
				projects.update((list) => [
					...list,
					{ id: newId, name: projectName, path: projectPath },
				]);
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

	function removeProject(id) {
		const filtered = $projects.filter((item) => item.id !== id);
		projects.set(filtered);
		menuActive.set("installed-apps");
		localStorage.setItem("projects", JSON.stringify(filtered));
	}
</script>

<aside class="nav">
	<div class="nav__drag"></div>

	<SimpleBar maxHeight={"calc(100vh - 100px)"}>
		<div class="nav__scroll">
			<section class="nav__section">
				<button
					class="nav__item"
					class:nav__item--active={$menuActive === "installed-apps"}
					onclick={() => menuActive.set("installed-apps")}
				>
					<svg
						class="nav__itemIcon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
					>
						<rect x="2" y="3" width="20" height="14" rx="2" />
						<line x1="8" y1="21" x2="16" y2="21" />
						<line x1="12" y1="17" x2="12" y2="21" />
					</svg>
					<span>Installed Apps</span>
					<span class="nav__itemBadge">System</span>
				</button>
			</section>

			<section class="nav__section">
				<div class="nav__secHeader">
					<span class="nav__secLabel">Projects</span>
					<button class="nav__secAdd" onclick={addProject} title="Add project">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
					</button>
				</div>

				{#if $projects.length === 0}
					<button class="nav__emptyAdd" onclick={addProject}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path
								d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
							/>
							<line x1="12" y1="11" x2="12" y2="17" />
							<line x1="9" y1="14" x2="15" y2="14" />
						</svg>
						Add your first project
					</button>
				{:else}
					{#each $projects as { id, name }}
						<div
							class="nav__project"
							class:nav__project--active={$menuActive === `project_${id}`}
						>
							<button
								class="nav__projectBtn"
								onclick={() => menuActive.set(`project_${id}`)}
							>
								<svg
									class="nav__projectIcon"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
								>
									<path
										d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
									/>
								</svg>
								<span class="nav__projectName">{name}</span>
							</button>
							<button
								class="nav__projectAction"
								aria-label="Remove project"
								onclick={() => removeProject(id)}
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
								>
									<line x1="18" x2="6" y1="6" y2="18" />
									<line x1="6" x2="18" y1="6" y2="18" />
								</svg>
							</button>
						</div>
					{/each}
				{/if}
			</section>
		</div>
	</SimpleBar>

	{#if activePkgs.length > 0}
		<div class="nav__pkgs">
			<span class="nav__secLabel">Package Managers</span>
			<div class="nav__pkgList">
				{#each activePkgs as { key, label, Icon }}
					<div class="nav__pkgRow">
						<figure class="nav__pkgIcon"><Icon /></figure>
						<span class="nav__pkgName">{label}</span>
						<span class="nav__pkgVer">{packages[key]?.trim()}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</aside>

<style lang="scss">
	.nav {
		width: 232px;
		min-width: 232px;
		height: 100vh;
		display: flex;
		flex-direction: column;
		// border-right: 1px solid var(--border-subtle);
		background: rgba(0, 0, 0, 0.12);
		overflow: hidden;
		padding-right: 10px;
	}

	/* ── Drag area (macOS titlebar) ─────────── */
	.nav__drag {
		height: 44px;
		flex-shrink: 0;
		-webkit-app-region: drag;
	}

	/* ── Scrollable body ────────────────────── */
	.nav__scroll {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 2px 10px 10px;
	}

	/* ── Section ────────────────────────────── */
	.nav__section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav__secHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 6px 6px;
	}

	.nav__secLabel {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-muted);
	}

	.nav__secAdd {
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		border-radius: 6px;
		border: 0;
		background: transparent;
		color: var(--text-muted);
		transition:
			background var(--transition-fast),
			color var(--transition-fast);

		svg {
			width: 12px;
			height: 12px;
		}

		&:hover {
			background: var(--glass-medium);
			color: var(--text-primary);
		}
	}

	/* ── Nav item (Installed Apps) ──────────── */
	.nav__item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 13px;
		text-align: left;
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			background: var(--glass-light);
			color: var(--text-primary);
		}

		&--active {
			background: var(--glass-medium);
			border-color: var(--border-subtle);
			color: var(--text-primary);
		}
	}

	.nav__itemIcon {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		color: inherit;
	}

	.nav__itemBadge {
		margin-left: auto;
		font-size: 10px;
		color: var(--text-muted);
	}

	/* ── Empty add ──────────────────────────── */
	.nav__emptyAdd {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px;
		border-radius: var(--radius-md);
		border: 1px dashed var(--border-subtle);
		background: transparent;
		color: var(--text-muted);
		font-size: 12px;
		transition:
			border-color var(--transition-fast),
			color var(--transition-fast),
			background var(--transition-fast);

		svg {
			width: 14px;
			height: 14px;
			flex-shrink: 0;
		}

		&:hover {
			border-color: var(--border-light);
			color: var(--text-secondary);
			background: var(--glass-ultra);
		}
	}

	/* ── Project row ────────────────────────── */
	.nav__project {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			background: var(--glass-ultra);
			.nav__projectAction {
				opacity: 1;
			}
		}

		&--active {
			background: var(--glass-light);
			border-color: var(--border-subtle);
		}
	}

	.nav__projectBtn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 8px 7px 10px;
		border: 0;
		background: transparent;
		color: var(--text-secondary);
		font-size: 12px;
		min-width: 0;
		text-align: left;

		.nav__project--active & {
			color: var(--text-primary);
		}
		.nav__project:hover & {
			color: var(--text-primary);
		}
	}

	.nav__projectIcon {
		width: 13px;
		height: 13px;
		flex-shrink: 0;
		color: var(--accent);
		opacity: 0.7;
	}

	.nav__projectName {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.nav__projectAction {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border: 0;
		background: transparent;
		color: var(--text-muted);
		opacity: 0;
		transition:
			opacity var(--transition-fast),
			color var(--transition-fast);
		flex-shrink: 0;

		svg {
			width: 12px;
			height: 12px;
		}

		&:hover {
			color: rgba(255, 100, 100, 0.85);
			opacity: 1;
		}
	}

	/* ── Package Managers ───────────────────── */
	.nav__pkgs {
		flex-shrink: 0;
		margin-top: auto;
		padding: 12px 14px 16px;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.nav__pkgList {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.nav__pkgRow {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 6px;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);

		&:hover {
			background: var(--glass-ultra);
		}
	}

	.nav__pkgIcon {
		width: 16px;
		height: 16px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.nav__pkgName {
		flex: 1;
		font-size: 12px;
		color: var(--text-secondary);
		min-width: 0;
	}

	.nav__pkgVer {
		font-size: 11px;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
