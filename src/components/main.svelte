<script>
	import { onDestroy, onMount } from "svelte";
	import { blur } from "svelte/transition";
	import { Toaster } from "svelte-sonner";
	import SimpleBar from "../components/SimpleBar.svelte";
	import PackageEditor from "../components/PackageEditor.svelte";
	import ComposerEditor from "../components/ComposerEditor.svelte";
	import AppleEditor from "../components/AppleEditor.svelte";
	import AndroidEditor from "../components/AndroidEditor.svelte";
	import FlutterEditor from "../components/FlutterEditor.svelte";
	import PolyglotEditor from "../components/PolyglotEditor.svelte";
	import InstalledAppsView from "../components/InstalledAppsView.svelte";
	import NpmIcon from "../icons/npm.svelte";
	import ComposerIcon from "../icons/composer.svelte";
	import SwiftIcon from "../icons/swift.svelte";
	import CocoaPodsIcon from "../icons/cocoapods.svelte";
	import GradleIcon from "../icons/gradle.svelte";
	import FlutterIcon from "../icons/flutter.svelte";
	import GoIcon from "../icons/go.svelte";
	import RustIcon from "../icons/rust.svelte";
	import RubyIcon from "../icons/ruby.svelte";
	import { projects, menuActive } from "../store";
	import {
		openDirectory,
		getProjectPackages,
		getProjectComposerPackages,
		getProjectSwiftPackages,
		getProjectPodPackages,
		getProjectAndroidManifest,
		getProjectFlutterManifest,
		getProjectGoManifest,
		getProjectCargoManifest,
		getProjectGemfile,
	} from "../utils/shell.js";

	let currentProjectID = $state(false);
	let currentProject = $state(undefined);
	let rawJson = $state("");
	let projectType = $state("npm");
	let manifestPath = $state("");
	let loading = $state(false);

	const supportedProjects = [
		{
			label: "Node.js",
			manifest: "package.json",
			accent: "node",
			icon: NpmIcon,
		},
		{
			label: "Composer",
			manifest: "composer.json",
			accent: "composer",
			icon: ComposerIcon,
		},
		{
			label: "SwiftPM",
			manifest: "Package.swift",
			accent: "swift",
			icon: SwiftIcon,
		},
		{
			label: "CocoaPods",
			manifest: "Podfile",
			accent: "pods",
			icon: CocoaPodsIcon,
		},
		{
			label: "Android",
			manifest: "build.gradle / libs.versions.toml",
			accent: "gradle",
			icon: GradleIcon,
		},
		{
			label: "Flutter",
			manifest: "pubspec.yaml",
			accent: "flutter",
			icon: FlutterIcon,
		},
		{ label: "Go", manifest: "go.mod", accent: "go", icon: GoIcon },
		{ label: "Rust", manifest: "Cargo.toml", accent: "rust", icon: RustIcon },
		{ label: "Ruby", manifest: "Gemfile", accent: "ruby", icon: RubyIcon },
	];

	const showingInstalledApps = $derived.by(() => {
		const value = $menuActive;
		return (
			!value ||
			value === "installed-apps" ||
			!String(value).startsWith("project_")
		);
	});

	$effect(() => {
		const value = $menuActive;
		currentProjectID =
			value && String(value).startsWith("project_")
				? value.split("_")[1]
				: false;
		const found = $projects.find(
			(item) => item.id === parseInt(currentProjectID),
		);
		currentProject = found;

		if (found) {
			loadProject(found.path);
		} else {
			rawJson = "";
			manifestPath = "";
			loading = false;
		}
	});

	async function loadProject(projectPath) {
		loading = true;
		try {
			try {
				rawJson = await getProjectComposerPackages(projectPath);
				projectType = "composer";
				manifestPath = `${projectPath}/composer.json`;
			} catch {
				try {
					rawJson = await getProjectPackages(projectPath);
					projectType = "npm";
					manifestPath = `${projectPath}/package.json`;
				} catch {
					try {
						rawJson = await getProjectFlutterManifest(projectPath);
						projectType = "flutter";
						manifestPath = `${projectPath}/pubspec.yaml`;
					} catch {
						try {
							rawJson = await getProjectGoManifest(projectPath);
							projectType = "go";
							manifestPath = `${projectPath}/go.mod`;
						} catch {
							try {
								rawJson = await getProjectCargoManifest(projectPath);
								projectType = "rust";
								manifestPath = `${projectPath}/Cargo.toml`;
							} catch {
								try {
									rawJson = await getProjectGemfile(projectPath);
									projectType = "ruby";
									manifestPath = `${projectPath}/Gemfile`;
								} catch {
									try {
										const androidManifest =
											await getProjectAndroidManifest(projectPath);
										rawJson = androidManifest.raw;
										projectType = androidManifest.projectType;
										manifestPath = androidManifest.manifestPath;
									} catch {
										try {
											rawJson = await getProjectPodPackages(projectPath);
											projectType = "cocoapods";
											manifestPath = `${projectPath}/Podfile`;
										} catch {
											rawJson = await getProjectSwiftPackages(projectPath);
											projectType = "swift";
											manifestPath = `${projectPath}/Package.swift`;
										}
									}
								}
							}
						}
					}
				}
			}
		} catch {
			rawJson = "";
			manifestPath = "";
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
				const newId =
					$projects.length > 0 ? $projects[$projects.length - 1].id + 1 : 0;
				projects.update((list) => {
					return [...list, { id: newId, name: projectName, path: projectPath }];
				});
				localStorage.setItem(
					"projects",
					JSON.stringify([
						...$projects,
						{ id: newId, name: projectName, path: projectPath },
					]),
				);
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
	{#if showingInstalledApps}
		<InstalledAppsView />
	{:else}
		<div class="project-shell">
			<SimpleBar maxHeight={"calc(100vh)"}>
				{#if !currentProject}
					<section class="empty">
						<div class="empty__card">
							<div class="empty__content">
								<div class="empty__copy">
									<div class="empty__eyebrow">Dependency command center</div>
									<h1 class="empty__title">
										Drop in any supported repo and start managing versions fast.
									</h1>
									<p class="empty__sub">
										Add a project folder to inspect dependencies, compare live
										registry versions, update manifests, and sync lock files
										from one polished desktop workflow.
									</p>
									<div class="empty__actions">
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
											Add Your First Project
										</button>
										<div class="empty__hint">
											Supports web, backend, mobile, and systems projects.
										</div>
									</div>
								</div>

								<div class="empty__visual">
									<div class="empty__halo empty__halo--one"></div>
									<div class="empty__halo empty__halo--two"></div>
									<div class="empty__preview">
										<div class="empty__previewHeader">
											<span class="empty__previewDot"></span>
											<span class="empty__previewDot"></span>
											<span class="empty__previewDot"></span>
											<strong>Supported Project Types</strong>
										</div>
										<div class="empty__grid">
											{#each supportedProjects as item}
												<div
													class={`ecosystemCard ecosystemCard--${item.accent}`}
												>
													<div class="ecosystemCard__icon">
														<item.icon />
													</div>
													<div class="ecosystemCard__body">
														<strong>{item.label}</strong>
														<span>{item.manifest}</span>
													</div>
												</div>
											{/each}
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
				{:else if loading}
					<div class="empty">
						<div class="empty__card">Loading project…</div>
					</div>
				{:else if projectType === "composer"}
					<ComposerEditor
						project={currentProject}
						{rawJson}
						onRefresh={handleRefresh}
					/>
				{:else if projectType === "swift" || projectType === "cocoapods"}
					<AppleEditor
						project={currentProject}
						{rawJson}
						{projectType}
						onRefresh={handleRefresh}
					/>
				{:else if projectType === "android-gradle" || projectType === "android-version-catalog"}
					<AndroidEditor
						project={currentProject}
						{rawJson}
						{projectType}
						{manifestPath}
						onRefresh={handleRefresh}
					/>
				{:else if projectType === "flutter"}
					<FlutterEditor
						project={currentProject}
						{rawJson}
						onRefresh={handleRefresh}
					/>
				{:else if projectType === "go" || projectType === "rust" || projectType === "ruby"}
					<PolyglotEditor
						project={currentProject}
						{rawJson}
						{projectType}
						onRefresh={handleRefresh}
					/>
				{:else}
					<PackageEditor
						project={currentProject}
						{rawJson}
						onRefresh={handleRefresh}
					/>
				{/if}
			</SimpleBar>
		</div>
	{/if}
	<Toaster richColors closeButton />
</div>

<style lang="scss">
	.content {
		flex: 1;
		min-width: 0;
		height: 100vh;
		display: flex;
		border-radius: 20px;
		background: #181818;
		margin-left: -10px;
	}

	.project-shell {
		flex: 1;
		min-width: 0;
		overflow: hidden;

		:global([data-simplebar]) {
			width: 100%;
		}
	}

	.empty {
		min-height: 100vh;
		padding: 28px;
		display: grid;
		place-items: center;
	}

	.empty__card {
		width: min(1120px, 100%);
		padding: 28px;
		border-radius: 30px;
		background: radial-gradient(
				circle at top right,
				rgba(120, 180, 255, 0.18),
				transparent 26%
			),
			radial-gradient(
				circle at left bottom,
				rgba(88, 216, 194, 0.12),
				transparent 22%
			),
			rgba(255, 255, 255, 0.05);
		backdrop-filter: var(--blur-amount, blur(18px));
		-webkit-backdrop-filter: var(--blur-amount, blur(18px));
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.empty__content {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
		gap: 28px;
		align-items: center;
	}

	.empty__eyebrow {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.empty__title {
		font-size: clamp(34px, 4vw, 56px);
		line-height: 0.98;
		margin-bottom: 18px;
	}

	.empty__sub,
	.empty__hint {
		color: var(--text-secondary);
		line-height: 1.65;
	}

	.empty__actions {
		margin-top: 24px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.empty__btn {
		border: 0;
		padding: 14px 18px;
		border-radius: 16px;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		background: linear-gradient(135deg, #78b4ff, #58d8c2);
		color: #07131f;
		font-weight: 700;
	}

	.empty__visual {
		position: relative;
		min-height: 420px;
	}

	.empty__halo {
		position: absolute;
		inset: auto;
		border-radius: 999px;
		filter: blur(32px);
		opacity: 0.75;
	}

	.empty__halo--one {
		width: 190px;
		height: 190px;
		top: 40px;
		right: 24px;
		background: rgba(120, 180, 255, 0.25);
	}

	.empty__halo--two {
		width: 150px;
		height: 150px;
		left: 10px;
		bottom: 30px;
		background: rgba(88, 216, 194, 0.22);
	}

	.empty__preview {
		position: relative;
		z-index: 1;
		padding: 20px;
		border-radius: 28px;
		background: rgba(4, 10, 18, 0.44);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
	}

	.empty__previewHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 18px;
		color: var(--text-secondary);
	}

	.empty__previewHeader strong {
		margin-left: 8px;
		color: var(--text-primary);
	}

	.empty__previewDot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.24);
	}

	.empty__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.ecosystemCard {
		padding: 16px;
		border-radius: 18px;
		display: flex;
		align-items: center;
		gap: 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.ecosystemCard__icon {
		width: 40px;
		height: 40px;
		border-radius: 14px;
		display: grid;
		place-items: center;
		background: rgba(255, 255, 255, 0.08);
	}

	.ecosystemCard__body {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.ecosystemCard__body span {
		color: var(--text-secondary);
		font-size: 12px;
	}

	@media (max-width: 1100px) {
		.empty__content {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 700px) {
		.empty {
			padding: 14px;
		}

		.empty__card {
			padding: 18px;
		}

		.empty__grid {
			grid-template-columns: 1fr;
		}
	}
</style>
