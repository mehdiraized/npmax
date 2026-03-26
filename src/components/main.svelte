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
	import SettingsView from "../components/SettingsView.svelte";
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
	import { parsePodfile, parseSwiftManifest } from "../utils/apple.js";
	import { parseGradleManifest, parseVersionCatalog } from "../utils/android.js";
	import { parsePubspec } from "../utils/flutter.js";
	import { parseCargoToml, parseGemfile, parseGoMod } from "../utils/polyglot.js";
	import {
		detectProjectType,
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
	let projectIssue = $state("");

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
		return !value || value === "installed-apps";
	});
	let settingsOpen = $state(false);

	const getDetectedPackageCount = (type, raw) => {
		if (!raw) return 0;

		try {
			if (type === "npm") {
				const pkg = JSON.parse(raw);
				return (
					Object.keys(pkg.dependencies ?? {}).length +
					Object.keys(pkg.devDependencies ?? {}).length
				);
			}

			if (type === "composer") {
				const composer = JSON.parse(raw);
				return (
					Object.keys(composer.require ?? {}).length +
					Object.keys(composer["require-dev"] ?? {}).length
				);
			}

			if (type === "flutter") return parsePubspec(raw).dependencies.length;
			if (type === "go") return parseGoMod(raw).dependencies.length;
			if (type === "rust") return parseCargoToml(raw).dependencies.length;
			if (type === "ruby") return parseGemfile(raw).dependencies.length;
			if (type === "swift") return parseSwiftManifest(raw).dependencies.length;
			if (type === "cocoapods") return parsePodfile(raw).dependencies.length;
			if (type === "android-gradle") {
				return parseGradleManifest(raw).dependencies.length;
			}
			if (type === "android-version-catalog") {
				return parseVersionCatalog(raw).dependencies.length;
			}
		} catch {
			return 0;
		}

		return 0;
	};

	const syncProjectIssue = () => {
		if (!currentProject) return;
		projectIssue =
			getDetectedPackageCount(projectType, rawJson) > 0 ? "" : "no-packages";
	};

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
			projectIssue = "";
		}
	});

	async function loadProject(projectPath) {
		loading = true;
		projectIssue = "";
		try {
			const detected = detectProjectType(projectPath);
			if (!detected) throw new Error("Unsupported project type");

			projectType = detected.projectType;
			manifestPath = detected.manifestPath;

			switch (detected.projectType) {
				case "composer":
					rawJson = await getProjectComposerPackages(projectPath);
					break;
				case "npm":
					rawJson = await getProjectPackages(projectPath);
					break;
				case "flutter":
					rawJson = await getProjectFlutterManifest(projectPath);
					break;
				case "go":
					rawJson = await getProjectGoManifest(projectPath);
					break;
				case "rust":
					rawJson = await getProjectCargoManifest(projectPath);
					break;
				case "ruby":
					rawJson = await getProjectGemfile(projectPath);
					break;
				case "android-gradle":
				case "android-version-catalog": {
					const androidManifest = await getProjectAndroidManifest(projectPath);
					rawJson = androidManifest.raw;
					projectType = androidManifest.projectType;
					manifestPath = androidManifest.manifestPath;
					break;
				}
				case "cocoapods":
					rawJson = await getProjectPodPackages(projectPath);
					break;
				case "swift":
					rawJson = await getProjectSwiftPackages(projectPath);
					break;
				default:
					throw new Error(`Unsupported project type: ${detected.projectType}`);
			}
		} catch {
			rawJson = "";
			manifestPath = "";
			projectType = "unknown";
			projectIssue = "unsupported";
		}

		loading = false;
		if (!projectIssue) syncProjectIssue();
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
		syncProjectIssue();
	}

	function reloadCurrentProject() {
		if (currentProject?.path) {
			loadProject(currentProject.path);
		}
	}

	function openSettings() {
		settingsOpen = true;
	}

	function closeSettings() {
		settingsOpen = false;
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
	<button class="content__settingsBtn" onclick={openSettings} aria-label="Open settings">
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
		>
			<circle cx="12" cy="12" r="3.2" />
			<path
				d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01A1.65 1.65 0 0 0 20.91 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
			/>
		</svg>
		<span>Settings</span>
	</button>

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
				{:else if projectIssue}
					<div class="empty">
						<div class="empty__card empty__card--notice">
							<div class="empty__notice">
								<div class="empty__noticeIcon">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path d="M12 9v4" />
										<path d="M12 17h.01" />
										<path
											d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
										/>
									</svg>
								</div>
								<div class="empty__eyebrow">Project not detected</div>
								<h2 class="empty__title empty__title--compact">
									{projectIssue === "unsupported"
										? "This folder is not a supported project."
										: "We couldn't detect any packages in this project."}
								</h2>
								<p class="empty__sub empty__sub--centered">
									{projectIssue === "unsupported"
										? "Please choose a valid project folder and try again."
										: "Please review the project path and choose the correct folder again."}
								</p>
								<div class="empty__actions empty__actions--centered">
									<button class="empty__btn" onclick={addProject}>
										Choose Another Folder
									</button>
								</div>
							</div>
						</div>
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
	<SettingsView open={settingsOpen} onClose={closeSettings} />
	<Toaster richColors closeButton />
</div>

<style lang="scss">
	.content {
		flex: 1;
		min-width: 0;
		height: 100vh;
		display: flex;
		position: relative;
		border-radius: 20px;
		background: #181818;
		margin-left: -10px;
	}

	.content__settingsBtn {
		position: absolute;
		top: 18px;
		right: 20px;
		z-index: 20;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 11px 14px;
		border-radius: 15px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		color: var(--text-primary);
		font-weight: 700;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
		transition:
			transform 160ms ease,
			background 160ms ease,
			border-color 160ms ease;

		svg {
			width: 16px;
			height: 16px;
		}

		&:hover {
			transform: translateY(-1px);
			background:
				linear-gradient(180deg, rgba(120, 180, 255, 0.18), rgba(88, 216, 194, 0.08));
			border-color: rgba(120, 180, 255, 0.22);
		}
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

	.empty__title--compact {
		font-size: clamp(26px, 3.2vw, 38px);
		max-width: 700px;
	}

	.empty__sub,
	.empty__hint {
		color: var(--text-secondary);
		line-height: 1.65;
	}

	.empty__sub--centered {
		max-width: 580px;
		margin: 0 auto;
		text-align: center;
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

	.empty__card--notice {
		width: min(760px, 100%);
		padding: 48px 32px;
	}

	.empty__notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty__noticeIcon {
		width: 72px;
		height: 72px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		margin-bottom: 18px;
		background: rgba(255, 184, 77, 0.12);
		color: #ffcf7d;
		border: 1px solid rgba(255, 207, 125, 0.18);
	}

	.empty__noticeIcon svg {
		width: 30px;
		height: 30px;
	}

	.empty__actions--centered {
		align-items: center;
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
		.content__settingsBtn {
			top: 14px;
			right: 14px;
		}

		.empty__content {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 700px) {
		.content__settingsBtn {
			padding: 10px 12px;

			span {
				display: none;
			}
		}

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
