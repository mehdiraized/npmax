	<script>
		import { onDestroy, onMount } from "svelte";
	import { shell } from "electron";
	import SimpleBar from "../components/SimpleBar.svelte";
	import {
		projects,
		menuActive,
		normalizeProjects,
		persistProjects,
	} from "../store";
	import {
		detectProjectType,
		globalPackages,
		openDirectory,
	} from "../utils/shell.js";
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
	let projectTypes = $state({});

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
	const projectIconByType = {
		npm: NpmIcon,
		composer: ComposerIcon,
		swift: SwiftIcon,
		cocoapods: CocoaPodsIcon,
		"android-gradle": GradleIcon,
		"android-version-catalog": GradleIcon,
		flutter: FlutterIcon,
		go: GoIcon,
		rust: RustIcon,
		ruby: RubyIcon,
	};

	function getProjectIcon(projectType) {
		return projectType ? projectIconByType[projectType] || null : null;
	}

	async function resolveProjectType(project) {
		if (!project?.path || projectTypes[project.id]) return;
		const detected = detectProjectType(project.path);
		projectTypes = {
			...projectTypes,
			[project.id]: detected?.projectType || "unknown",
		};
	}

	onMount(async () => {
		packages = isJson(localStorage.getItem("packages"))
			? JSON.parse(localStorage.getItem("packages"))
			: {};
		const rawStoredProjects =
			localStorage.getItem("projects") !== "null"
				? JSON.parse(localStorage.getItem("projects") || "[]")
				: [];
		const storedProjects = persistProjects(rawStoredProjects);
		projects.set(storedProjects);
		for (const project of storedProjects) {
			void resolveProjectType(project);
		}
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

	$effect(() => {
		for (const project of $projects) {
			void resolveProjectType(project);
		}
	});

	async function addProject() {
		try {
			const result = await openDirectory();
			if (result.length > 0) {
				const projectPath = result[0];
				const parts = result[0].split("/");
				const projectName = parts[parts.length - 1];
				const existing = $projects.find((project) => project.path === projectPath);

				if (existing) {
					menuActive.set(`project_${existing.id}`);
					return;
				}

				const newId =
					$projects.length > 0
						? Math.max(...$projects.map((project) => Number(project.id) || 0)) + 1
						: 0;
				const nextProject = { id: newId, name: projectName, path: projectPath };
				const nextProjects = persistProjects([...$projects, nextProject]);
				projects.set(nextProjects);
				void resolveProjectType(nextProject);
				menuActive.set(`project_${newId}`);
			}
		} catch (err) {
			console.error(err);
		}
	}

	function removeProject(id) {
		const filtered = normalizeProjects($projects.filter((item) => item.id !== id));
		projects.set(filtered);
		menuActive.set("installed-apps");
		persistProjects(filtered);
	}

	function openBugReport() {
		const params = new URLSearchParams({
			title: "[Bug Report] ",
			body: [
				"## Summary",
				"Describe the problem clearly.",
				"",
				"## Steps to reproduce",
				"1.",
				"2.",
				"3.",
				"",
				"## Expected result",
				"",
				"## Actual result",
				"",
				"## Environment",
				`- Platform: ${navigator.platform || "Unknown"}`,
				`- User agent: ${navigator.userAgent || "Unknown"}`,
				"",
				"## Additional context",
				"",
				"---",
				"*Opened from npMax sidebar report shortcut*",
			].join("\n"),
			labels: "bug",
		});

		void shell.openExternal(
			`https://github.com/mehdiraized/npmax/issues/new?${params.toString()}`,
		);
	}

	function openSettings() {
		window.dispatchEvent(new CustomEvent("npmax:open-settings"));
	}
</script>

<aside class="nav">
	<SimpleBar maxHeight={"calc(100vh - 100px)"}>
		<div class="nav__scroll">
			<section class="nav__section">
				<div class="nav__topActions">
					<button
						class="nav__iconBtn"
						onclick={openBugReport}
						title="Report an issue on GitHub"
						aria-label="Report an issue on GitHub"
						>
							<svg
								viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<path d="M12 9v4" />
							<path d="M12 17h.01" />
								<path
									d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
								/>
							</svg>
						</button>
						<button
							class="nav__iconBtn"
						onclick={openSettings}
						title="Open application settings"
						aria-label="Open application settings"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						>
							<circle cx="12" cy="12" r="3.2" />
								<path
									d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01A1.65 1.65 0 0 0 20.91 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
								/>
							</svg>
						</button>
					</div>
				</section>

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
						{@const ProjectIcon = getProjectIcon(projectTypes[id])}
						<div
							class="nav__project"
							class:nav__project--active={$menuActive === `project_${id}`}
						>
							<button
								class="nav__projectBtn"
								onclick={() => menuActive.set(`project_${id}`)}
							>
								<span class="nav__projectIcon">
									{#if ProjectIcon}
										<ProjectIcon />
									{:else}
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.6"
										>
											<path
												d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
											/>
										</svg>
									{/if}
								</span>
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
		--text-primary: rgba(255, 255, 255, 0.98);
		--text-secondary: rgba(255, 255, 255, 0.86);
		--text-muted: rgba(255, 255, 255, 0.66);
		--border-subtle: rgba(255, 255, 255, 0.18);
		--border-light: rgba(255, 255, 255, 0.3);

		width: 232px;
		min-width: 232px;
		height: 100vh;
		display: flex;
		flex-direction: column;
		border-right: 1px solid rgba(255, 255, 255, 0.14);
		background:
			linear-gradient(180deg, rgba(12, 16, 24, 0.68), rgba(12, 16, 24, 0.56)),
			rgba(12, 16, 24, 0.58);
		backdrop-filter: blur(28px) saturate(170%);
		-webkit-backdrop-filter: blur(28px) saturate(170%);
		box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.18);
		overflow: hidden;
		padding-right: 10px;
	}

	/* ── Scrollable body ────────────────────── */
	.nav__scroll {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 0 10px 10px;
	}

	/* ── Section ────────────────────────────── */
	.nav__section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav__topActions {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 6px;
		min-height: 40px;
		padding: 10px 6px 4px 74px;
		-webkit-app-region: drag;
	}

	.nav__iconBtn {
		width: 28px;
		height: 28px;
		display: inline-grid;
		place-items: center;
		padding: 0;
		border-radius: 999px;
		border: 1px solid var(--border-subtle);
		background: var(--glass-ultra);
		color: var(--text-muted);
		-webkit-app-region: no-drag;
		transition:
			transform var(--transition-fast),
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);

		svg {
			width: 14px;
			height: 14px;
			flex-shrink: 0;
		}

		&:hover {
			transform: translateY(-1px);
			background: var(--glass-medium);
			border-color: var(--border-light);
			color: var(--text-primary);
		}
	}

	.nav__secHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 6px 6px;
	}

	.nav__secLabel {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
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
		min-height: 38px;
		padding: 9px 10px;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 600;
		line-height: 1.2;
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
			background: rgba(255, 255, 255, 0.14);
			border-color: var(--border-light);
			color: var(--text-primary);
		}
	}

	.nav__itemIcon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: inherit;
	}

	.nav__itemBadge {
		margin-left: auto;
		font-size: 11px;
		color: var(--text-muted);
	}

	/* ── Empty add ──────────────────────────── */
	.nav__emptyAdd {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 38px;
		padding: 10px;
		border-radius: var(--radius-md);
		border: 1px dashed var(--border-subtle);
		background: transparent;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.2;
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
			background: rgba(255, 255, 255, 0.12);
			border-color: var(--border-light);
		}
	}

	.nav__projectBtn {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding: 8px 8px 8px 10px;
		border: 0;
		background: transparent;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 600;
		line-height: 1.2;
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
		width: 15px;
		height: 15px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		color: var(--accent);
		opacity: 0.7;

		:global(svg) {
			width: 100%;
			height: 100%;
			display: block;
			fill: currentColor;
		}
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
		padding: 8px 14px 10px;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.nav__pkgList {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.nav__pkgRow {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 30px;
		padding: 2px 8px;
	}

	.nav__pkgIcon {
		width: 20px;
		height: 20px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		padding: 2px;
		border-radius: 6px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.nav__pkgName {
		flex: 1;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 0;
	}

	.nav__pkgVer {
		font-size: 12px;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
