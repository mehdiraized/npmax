<script>
	import { toast } from "svelte-sonner";
	import PackageDetailsModal from "./PackageDetailsModal.svelte";
	import {
		fetchCocoaPodInfo,
		fetchSwiftPackagesInfo,
		getCocoaPodDetails,
		getSwiftPackageDetails,
	} from "../api/swift.js";
	import {
		checkPodLockFile,
		checkSwiftResolvedFile,
		getProjectPodPackages,
		getProjectSwiftPackages,
		runPodInstall,
		runSwiftPackageResolve,
		updatePodPackageVersion,
		updateSwiftPackageVersion,
	} from "../utils/shell.js";
	import { normalizeVersionConstraint, parsePodfile, parseSwiftManifest } from "../utils/apple.js";

	let { project, rawJson, projectType, onRefresh = () => {} } = $props();

	let manifest = $derived.by(() =>
		projectType === "swift" ? parseSwiftManifest(rawJson) : parsePodfile(rawJson),
	);

	let dependencies = $derived.by(() => manifest.dependencies ?? []);

	let infoMap = $state({});
	let detailsOpen = $state(false);
	let selectedDependency = $state(null);
	let packageDetails = $state(null);
	let detailsLoading = $state(false);
	let detailsError = $state("");
	let lockStatus = $state("ok");
	let installing = $state(false);

	const manifestLabel = $derived(projectType === "swift" ? "Package.swift" : "Podfile");
	const installLabel = $derived(projectType === "swift" ? "Resolve" : "Install");

	const isFetchable = (dependency) =>
		projectType === "swift"
			? dependency.sourceType === "github"
			: Boolean(dependency.name);

	$effect(() => {
		const _ = rawJson;
		infoMap = {};
		const fetchable = dependencies.filter(isFetchable);

		for (const dependency of dependencies) {
			infoMap = {
				...infoMap,
				[dependency.id]: isFetchable(dependency)
					? { status: "loading" }
					: { status: "unsupported" },
			};
		}

		if (fetchable.length === 0) return;

		if (projectType === "swift") {
			fetchSwiftPackagesInfo(fetchable, (id, data) => {
				infoMap = {
					...infoMap,
					[id]: data
						? { status: data.version ? "fetched" : "error", ...data }
						: { status: "error" },
				};
			});
			return;
		}

		fetchCocoaPodInfo(
			fetchable.map((item) => item.name),
			(name, data) => {
				const dependency = fetchable.find((item) => item.name === name);
				if (!dependency) return;
				infoMap = {
					...infoMap,
					[dependency.id]: data
						? { status: data.version ? "fetched" : "error", ...data }
						: { status: "error" },
				};
			},
		);
	});

	$effect(() => {
		const _ = rawJson;
		if (!project?.path) return;
		lockStatus =
			projectType === "swift"
				? checkSwiftResolvedFile(project.path)
				: checkPodLockFile(project.path);
	});

	function getStatus(dependency) {
		const info = infoMap[dependency.id];
		if (!info) return "loading";
		if (info.status === "unsupported") return "unsupported";
		if (info.status === "loading") return "loading";
		if (info.status === "error") return "error";
		const latest = normalizeVersionConstraint(info.version);
		const current = normalizeVersionConstraint(dependency.version);
		if (!latest || !current) return "manual";
		return current === latest ? "ok" : "update";
	}

	function getLatest(dependency) {
		return infoMap[dependency.id]?.version ?? null;
	}

	async function openDependencyDetails(dependency) {
		selectedDependency = dependency;
		detailsOpen = true;
		detailsLoading = true;
		detailsError = "";
		packageDetails = null;

		try {
			packageDetails =
				projectType === "swift"
					? await getSwiftPackageDetails(dependency)
					: await getCocoaPodDetails(dependency.name);
		} catch (err) {
			detailsError =
				err.message || `Failed to load details for ${dependency.displayName}`;
		} finally {
			detailsLoading = false;
		}
	}

	function closePackageDetails() {
		detailsOpen = false;
	}

	async function handleUpdate(dependency) {
		const latestVersion = getLatest(dependency);
		if (!latestVersion) return;

		try {
			const updated =
				projectType === "swift"
					? await updateSwiftPackageVersion(project.path, dependency, latestVersion)
					: await updatePodPackageVersion(project.path, dependency, latestVersion);
			toast.success(`Updated ${dependency.displayName}`, {
				description: `-> ${updated}`,
				position: "bottom-center",
			});

			const newRaw =
				projectType === "swift"
					? await getProjectSwiftPackages(project.path)
					: await getProjectPodPackages(project.path);
			onRefresh(newRaw);
		} catch (err) {
			toast.error(`Failed to update ${dependency.displayName}`, {
				description: err.message,
				position: "bottom-center",
			});
		}
	}

	async function handleInstall() {
		installing = true;
		try {
			if (projectType === "swift") {
				await runSwiftPackageResolve(project.path);
				lockStatus = checkSwiftResolvedFile(project.path);
				toast.success("swift package resolve complete", {
					position: "bottom-center",
				});
			} else {
				await runPodInstall(project.path);
				lockStatus = checkPodLockFile(project.path);
				toast.success("pod install complete", {
					position: "bottom-center",
				});
			}
		} catch (err) {
			toast.error(`${installLabel} failed`, {
				description: err.message,
				position: "bottom-center",
			});
		} finally {
			installing = false;
		}
	}

	let stats = $derived.by(() => {
		let total = dependencies.length;
		let outdated = 0;
		let loading = 0;

		for (const dependency of dependencies) {
			const status = getStatus(dependency);
			if (status === "loading") loading++;
			if (status === "update") outdated++;
		}

		return { total, outdated, loading };
	});
</script>

<div class="editor">
	<div class="editor__meta">
		<div class="editor__metaLeft">
			<span class="meta__filename">{manifestLabel}</span>
			{#if manifest.name}
				<span class="meta__dot">·</span>
				<span class="meta__name">{manifest.name}</span>
			{/if}
			<span class="meta__version">{projectType === "swift" ? "SwiftPM" : "CocoaPods"}</span>
		</div>
		<div class="editor__metaRight">
			{#if lockStatus === "stale" || lockStatus === "missing"}
				<button class="install-btn" onclick={handleInstall} disabled={installing}>
					{#if installing}
						<span class="spin"></span> {installLabel}...
					{:else}
						<svg
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							width="12"
							height="12"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" /></svg
						>
						{lockStatus === "missing" ? installLabel : "Sync"}
					{/if}
				</button>
			{/if}
			{#if stats.loading > 0}
				<span class="stat stat--loading">
					<span class="spin"></span>
					Checking {stats.loading}...
				</span>
			{:else if stats.outdated > 0}
				<span class="stat stat--warn">{stats.outdated} outdated</span>
			{:else}
				<span class="stat stat--ok">All up to date</span>
			{/if}
			<span class="stat stat--total">{stats.total} packages</span>
		</div>
	</div>

	<div class="editor__body">
		<div class="code">
			<div class="line"><span class="tok-brace">{manifestLabel}</span></div>
			{#if dependencies.length === 0}
				<div class="line line--empty">No Apple dependencies found.</div>
			{:else}
				{#each dependencies as dependency}
					<div class="line pkg-line">
						<button
							class="pkg-name tok-pkg"
							onclick={() => openDependencyDetails(dependency)}
						>
							{dependency.displayName}
						</button>
						<span class="tok-colon">:</span>
						<span class="tok-ver">
							{dependency.rawRequirement ||
								(dependency.localPath ? `path ${dependency.localPath}` : "unversioned")}
						</span>
						<span class="pkg-status">
							{#if getStatus(dependency) === "loading"}
								<span class="badge badge--loading"><span class="spin-sm"></span></span>
							{:else if getStatus(dependency) === "update"}
								<button class="badge badge--update" onclick={() => handleUpdate(dependency)}>
									↑ {getLatest(dependency)}
								</button>
							{:else if getStatus(dependency) === "unsupported"}
								<span class="badge badge--manual">manual</span>
							{:else if getStatus(dependency) === "manual"}
								<span class="badge badge--manual">review</span>
							{:else}
								<span class="badge badge--error">✕</span>
							{/if}

							{#if infoMap[dependency.id]?.homepage}
								<a class="link-icon" href={infoMap[dependency.id].homepage} title="Homepage">
									<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
										<circle cx="8" cy="8" r="6.5" />
										<path d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13" />
									</svg>
								</a>
							{/if}
						</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<PackageDetailsModal
	open={detailsOpen}
	detail={packageDetails}
	loading={detailsLoading}
	error={detailsError}
	requestedName={selectedDependency?.displayName || ""}
	currentVersion={selectedDependency?.rawRequirement || null}
	on:close={closePackageDetails}
/>

<style lang="scss">
	.editor {
		margin: 1rem;
		display: flex;
		flex-direction: column;
		height: 100%;
		border-radius: var(--radius-lg, 18px);
		overflow: hidden;
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		box-shadow: var(--shadow-md);
	}

	.editor__meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 18px;
		background: rgba(0, 0, 0, 0.3);
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		flex-shrink: 0;
	}

	.editor__metaLeft,
	.editor__metaRight {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.meta__filename {
		font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
		color: var(--text-secondary, rgba(255, 255, 255, 0.55));
	}

	.meta__dot {
		color: var(--text-muted, rgba(255, 255, 255, 0.25));
	}

	.meta__name {
		font-weight: 600;
		color: var(--text-primary, rgba(255, 255, 255, 0.9));
	}

	.meta__version,
	.stat,
	.badge,
	.install-btn {
		font-size: 11px;
		border-radius: 99px;
	}

	.meta__version,
	.stat {
		padding: 2px 9px;
	}

	.meta__version {
		background: rgba(91, 156, 246, 0.12);
		color: rgba(91, 156, 246, 0.8);
		border: 1px solid rgba(91, 156, 246, 0.2);
		font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.stat--total {
		color: var(--text-muted, rgba(255, 255, 255, 0.28));
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.stat--ok {
		color: rgba(52, 199, 89, 0.85);
		background: rgba(52, 199, 89, 0.1);
		border: 1px solid rgba(52, 199, 89, 0.18);
	}

	.stat--warn {
		color: rgba(255, 159, 10, 0.9);
		background: rgba(255, 159, 10, 0.1);
		border: 1px solid rgba(255, 159, 10, 0.2);
	}

	.stat--loading {
		color: var(--text-secondary, rgba(255, 255, 255, 0.5));
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.editor__body {
		flex: 1;
		overflow: auto;
		padding: 18px 0 24px;
		background: rgba(0, 0, 0, 0.18);
	}

	.code {
		margin: 0;
		padding: 0 20px;
		font-family: "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono",
			monospace;
		font-size: 13px;
		color: var(--text-primary, rgba(255, 255, 255, 0.9));
	}

	.line {
		line-height: 28px;
		min-height: 28px;
		white-space: nowrap;
	}

	.line--empty {
		color: var(--text-secondary, rgba(255, 255, 255, 0.5));
	}

	.tok-brace {
		color: #e06c75;
		font-weight: 600;
	}

	.tok-colon {
		color: rgba(255, 255, 255, 0.3);
		margin: 0 10px;
	}

	.tok-pkg {
		color: #c9d1d9;
	}

	.tok-ver {
		color: #f8c555;
	}

	.pkg-line {
		display: inline-flex;
		align-items: center;
		width: 100%;
	}

	.pkg-name {
		padding: 0;
		border: 0;
		background: transparent;
		font: inherit;
		cursor: pointer;
		text-align: left;
		transition: color 0.18s ease, text-shadow 0.18s ease;

		&:hover {
			color: #ffffff;
			text-shadow: 0 0 14px rgba(122, 179, 255, 0.28);
		}
	}

	.pkg-status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-left: 14px;
		font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
		font-size: 11px;
	}

	.badge {
		display: inline-flex;
		height: 19px;
		align-items: center;
		gap: 4px;
		padding: 1px 7px;
		font-weight: 500;

	}

	.badge--update {
		color: rgba(41, 182, 246, 0.95);
		background: rgba(41, 182, 246, 0.12);
		border: 1px solid rgba(41, 182, 246, 0.3);
		cursor: pointer;
	}

	.badge--error {
		color: rgba(255, 80, 80, 0.7);
		background: rgba(255, 80, 80, 0.08);
		border: 1px solid rgba(255, 80, 80, 0.15);
	}

	.badge--loading,
	.badge--manual {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	.install-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 12px;
		border: 1px solid rgba(255, 159, 10, 0.35);
		background: rgba(255, 159, 10, 0.12);
		color: rgba(255, 159, 10, 0.95);
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}

	.link-icon {
		display: inline-flex;
		align-items: center;
		color: rgba(255, 255, 255, 0.48);

		svg {
			width: 12px;
			height: 12px;
		}
	}

	.spin,
	.spin-sm {
		display: inline-block;
		border-radius: 999px;
		border: 2px solid rgba(255, 255, 255, 0.15);
		border-top-color: rgba(255, 255, 255, 0.8);
		animation: spin 0.8s linear infinite;
	}

	.spin {
		width: 12px;
		height: 12px;
	}

	.spin-sm {
		width: 10px;
		height: 10px;
		border-width: 1.6px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
