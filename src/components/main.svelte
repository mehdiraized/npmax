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
	let projectType = $state("npm"); // "npm" | "composer" | "swift" | "cocoapods" | "android-gradle" | "android-version-catalog" | "flutter" | "go" | "rust" | "ruby"
	let manifestPath = $state("");
	let loading = $state(false);

	const supportedProjects = [
		{ label: "Node.js", manifest: "package.json", accent: "node", icon: NpmIcon },
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
			manifestPath = "";
			loading = false;
		}
	});

	async function loadProject(projectPath) {
		loading = true;
		try {
			// Detect supported manifests in priority order.
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
										const androidManifest = await getProjectAndroidManifest(projectPath);
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
					<div class="empty__content">
						<div class="empty__copy">
							<div class="empty__eyebrow">Dependency command center</div>
							<h1 class="empty__title">Drop in any supported repo and start managing versions fast.</h1>
							<p class="empty__sub">
								Add a project folder to inspect dependencies, compare live registry
								versions, update manifests, and sync lock files from one polished
								desktop workflow.
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
								<div class="empty__hint">Supports web, backend, mobile, and systems projects.</div>
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
										<div class={`ecosystemCard ecosystemCard--${item.accent}`}>
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
		padding: 34px;
		background:
			radial-gradient(circle at 16% 18%, rgba(91, 156, 246, 0.16), transparent 24%),
			radial-gradient(circle at 84% 22%, rgba(20, 184, 166, 0.13), transparent 20%),
			radial-gradient(circle at 70% 80%, rgba(255, 159, 10, 0.1), transparent 20%);
	}

	.empty__card {
		position: relative;
		width: min(1180px, 100%);
		border-radius: 38px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03)),
			rgba(8, 12, 24, 0.68);
		backdrop-filter: blur(24px) saturate(185%);
		-webkit-backdrop-filter: blur(24px) saturate(185%);
		box-shadow:
			0 32px 90px rgba(0, 0, 0, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.16);
		overflow: hidden;
	}

	.empty__content {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
		gap: 36px;
		padding: 54px;
	}

	.empty__copy {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
	}

	.empty__eyebrow {
		display: inline-flex;
		align-items: center;
		padding: 10px 16px;
		border-radius: 999px;
		border: 1px solid rgba(91, 156, 246, 0.24);
		background: rgba(91, 156, 246, 0.1);
		color: #8bc5ff;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.empty__title {
		margin-top: 18px;
		max-width: 11ch;
		font-size: clamp(38px, 4.8vw, 64px);
		line-height: 0.96;
		font-weight: 700;
		color: var(--text-primary, rgba(255, 255, 255, 0.94));
		letter-spacing: -0.05em;
		text-align: left;
	}

	.empty__sub {
		margin-top: 20px;
		max-width: 58ch;
		font-size: 16px;
		color: rgba(255, 255, 255, 0.64);
		line-height: 1.78;
		text-align: left;
	}

	.empty__actions {
		margin-top: 30px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 14px;
	}

	.empty__btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 24px;
		border-radius: 18px;
		border: 1px solid rgba(91, 156, 246, 0.32);
		background:
			linear-gradient(135deg, rgba(91, 156, 246, 0.26), rgba(91, 156, 246, 0.14)),
			rgba(91, 156, 246, 0.08);
		color: #9dcbff;
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.02em;
		cursor: pointer;
		transition:
			transform var(--transition-base, 0.25s ease),
			box-shadow var(--transition-base, 0.25s ease),
			background var(--transition-base, 0.25s ease);
		box-shadow: 0 16px 30px rgba(91, 156, 246, 0.16);

		svg {
			width: 16px;
			height: 16px;
		}

		&:hover {
			transform: translateY(-2px);
			background:
				linear-gradient(135deg, rgba(91, 156, 246, 0.34), rgba(91, 156, 246, 0.16)),
				rgba(91, 156, 246, 0.12);
			box-shadow: 0 20px 36px rgba(91, 156, 246, 0.24);
		}

		&:active {
			transform: scale(0.97);
		}
	}

	.empty__hint {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.45);
		letter-spacing: 0.01em;
	}

	.empty__visual {
		position: relative;
		min-height: 560px;
		display: flex;
		align-items: stretch;
		justify-content: stretch;
	}

	.empty__halo {
		position: absolute;
		border-radius: 999px;
		filter: blur(20px);
		pointer-events: none;
	}

	.empty__halo--one {
		inset: 24px auto auto 24px;
		width: 200px;
		height: 200px;
		background: rgba(91, 156, 246, 0.18);
	}

	.empty__halo--two {
		inset: auto 16px 16px auto;
		width: 250px;
		height: 250px;
		background: rgba(20, 184, 166, 0.16);
	}

	.empty__preview {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 18px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
			rgba(7, 10, 21, 0.66);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.12),
			0 22px 44px rgba(0, 0, 0, 0.32);
	}

	.empty__previewHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 4px 16px;
		color: rgba(255, 255, 255, 0.74);
		font-size: 13px;
		font-weight: 600;

		strong {
			margin-left: 6px;
			font-size: 12px;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: rgba(255, 255, 255, 0.42);
		}
	}

	.empty__previewDot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);

		&:nth-child(1) {
			background: #ff6b6b;
		}

		&:nth-child(2) {
			background: #ffd166;
		}

		&:nth-child(3) {
			background: #06d6a0;
		}
	}

	.empty__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		flex: 1;
	}

	.ecosystemCard {
		--card-color: rgba(255, 255, 255, 0.85);
		--card-glow: rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 18px;
		border-radius: 22px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
			var(--card-glow);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.ecosystemCard__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 54px;
		height: 54px;
		border-radius: 18px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.05);
		color: var(--card-color);
		flex-shrink: 0;
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);

		:global(svg) {
			width: 28px;
			height: 28px;
		}
	}

	.ecosystemCard__body {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;

		strong {
			font-size: 15px;
			font-weight: 700;
			color: rgba(255, 255, 255, 0.92);
			letter-spacing: -0.02em;
		}

		span {
			font-size: 12px;
			color: rgba(255, 255, 255, 0.5);
			line-height: 1.5;
			word-break: break-word;
		}
	}

	.ecosystemCard--node {
		--card-color: #7ed69b;
		--card-glow: rgba(126, 214, 155, 0.14);
	}

	.ecosystemCard--composer {
		--card-color: #e8bf7d;
		--card-glow: rgba(232, 191, 125, 0.14);
	}

	.ecosystemCard--swift {
		--card-color: #ff9e63;
		--card-glow: rgba(255, 158, 99, 0.14);
	}

	.ecosystemCard--pods {
		--card-color: #f6c66b;
		--card-glow: rgba(246, 198, 107, 0.14);
	}

	.ecosystemCard--gradle {
		--card-color: #73d4cb;
		--card-glow: rgba(115, 212, 203, 0.14);
	}

	.ecosystemCard--flutter {
		--card-color: #79c8ff;
		--card-glow: rgba(121, 200, 255, 0.14);
	}

	.ecosystemCard--go {
		--card-color: #70d8ea;
		--card-glow: rgba(112, 216, 234, 0.14);
	}

	.ecosystemCard--rust {
		--card-color: #d6b38b;
		--card-glow: rgba(214, 179, 139, 0.14);
	}

	.ecosystemCard--ruby {
		--card-color: #ff8f9f;
		--card-glow: rgba(255, 143, 159, 0.14);
	}

	@media (max-width: 900px) {
		.empty {
			padding: 22px;
		}

		.empty__content {
			grid-template-columns: 1fr;
			padding: 28px;
			gap: 26px;
		}

		.empty__title,
		.empty__sub {
			max-width: none;
		}

		.empty__visual {
			min-height: auto;
		}
	}

	@media (max-width: 640px) {
		.empty {
			padding: 16px;
		}

		.empty__card {
			border-radius: 26px;
		}

		.empty__content {
			padding: 22px 18px;
			gap: 20px;
		}

		.empty__title {
			font-size: 34px;
		}

		.empty__sub {
			font-size: 14px;
		}

		.empty__grid {
			grid-template-columns: 1fr;
		}

		.ecosystemCard {
			padding: 14px;
		}
	}

	@media (max-height: 760px) {
		.empty {
			padding-top: 20px;
			padding-bottom: 20px;
		}

		.empty__content {
			padding-top: 28px;
			padding-bottom: 28px;
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
