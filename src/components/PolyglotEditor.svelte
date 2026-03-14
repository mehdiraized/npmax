<script>
	import { toast } from "svelte-sonner";
	import PackageDetailsModal from "./PackageDetailsModal.svelte";
	import {
		fetchPolyglotPackagesInfo,
		getPolyglotPackageDetails,
	} from "../api/polyglot.js";
	import {
		checkPolyglotLockFile,
		getProjectCargoManifest,
		getProjectGemfile,
		getProjectGoManifest,
		runPolyglotSync,
		updatePolyglotPackageVersion,
	} from "../utils/shell.js";
	import {
		normalizePolyglotVersion,
		parseCargoToml,
		parseGemfile,
		parseGoMod,
	} from "../utils/polyglot.js";

	let { project, rawJson, projectType, onRefresh = () => {} } = $props();

	const manifestParsers = {
		go: parseGoMod,
		rust: parseCargoToml,
		ruby: parseGemfile,
	};

	const manifestNames = {
		go: "go.mod",
		rust: "Cargo.toml",
		ruby: "Gemfile",
	};

	const labels = {
		go: "Go Modules",
		rust: "Rust / Cargo",
		ruby: "Ruby / Bundler",
	};

	let manifest = $derived.by(() => manifestParsers[projectType](rawJson));
	let dependencies = $derived.by(() => manifest.dependencies ?? []);
	let infoMap = $state({});
	let detailsOpen = $state(false);
	let selectedDependency = $state(null);
	let packageDetails = $state(null);
	let detailsLoading = $state(false);
	let detailsError = $state("");
	let lockStatus = $state("ok");
	let syncing = $state(false);

	$effect(() => {
		const _ = rawJson;
		infoMap = {};
		if (dependencies.length === 0) return;
		const initial = {};
		for (const dependency of dependencies) initial[dependency.id] = { status: "loading" };
		infoMap = initial;
		fetchPolyglotPackagesInfo(projectType, dependencies, (id, data) => {
			infoMap = {
				...infoMap,
				[id]: data
					? { status: data.version ? "fetched" : "error", ...data }
					: { status: "error" },
			};
		});
	});

	$effect(() => {
		const _ = rawJson;
		if (project?.path) lockStatus = checkPolyglotLockFile(project.path, projectType);
	});

	function getStatus(dependency) {
		const info = infoMap[dependency.id];
		if (!info || info.status === "loading") return "loading";
		if (info.status === "error") return "error";
		const latest = normalizePolyglotVersion(info.version);
		const current = normalizePolyglotVersion(dependency.version);
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
			packageDetails = await getPolyglotPackageDetails(projectType, dependency);
		} catch (err) {
			detailsError = err.message || `Failed to load details for ${dependency.name}`;
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
			const updated = await updatePolyglotPackageVersion(
				project.path,
				projectType,
				dependency,
				latestVersion,
			);
			toast.success(`Updated ${dependency.name}`, {
				description: `-> ${updated}`,
				position: "bottom-center",
			});

			const refreshers = {
				go: getProjectGoManifest,
				rust: getProjectCargoManifest,
				ruby: getProjectGemfile,
			};
			onRefresh(await refreshers[projectType](project.path));
		} catch (err) {
			toast.error(`Failed to update ${dependency.name}`, {
				description: err.message,
				position: "bottom-center",
			});
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			await runPolyglotSync(project.path, projectType);
			lockStatus = checkPolyglotLockFile(project.path, projectType);
			toast.success(`${labels[projectType]} sync complete`, {
				position: "bottom-center",
			});
		} catch (err) {
			toast.error(`${labels[projectType]} sync failed`, {
				description: err.message,
				position: "bottom-center",
			});
		} finally {
			syncing = false;
		}
	}

	let stats = $derived.by(() => {
		let outdated = 0;
		let loading = 0;
		for (const dependency of dependencies) {
			const status = getStatus(dependency);
			if (status === "loading") loading++;
			if (status === "update") outdated++;
		}
		return { total: dependencies.length, outdated, loading };
	});
</script>

<div class="editor">
	<div class="editor__meta">
		<div class="editor__metaLeft">
			<span class="meta__filename">{manifestNames[projectType]}</span>
			<span class="meta__version">{labels[projectType]}</span>
		</div>
		<div class="editor__metaRight">
			{#if lockStatus === "stale" || lockStatus === "missing"}
				<button class="install-btn" onclick={handleSync} disabled={syncing}>
					{#if syncing}
						<span class="spin"></span> Syncing...
					{:else}
						{lockStatus === "missing" ? "Install" : "Sync"}
					{/if}
				</button>
			{/if}
			{#if stats.loading > 0}
				<span class="stat stat--loading"><span class="spin"></span> Checking {stats.loading}...</span>
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
			<div class="line"><span class="tok-brace">{manifestNames[projectType]}</span></div>
			{#if dependencies.length === 0}
				<div class="line line--empty">No dependencies found.</div>
			{:else}
				{#each dependencies as dependency}
					<div class="line pkg-line">
						<button class="pkg-name tok-pkg" onclick={() => openDependencyDetails(dependency)}>
							{dependency.name}
						</button>
						<span class="tok-colon">:</span>
						<span class="tok-ver">{dependency.rawRequirement || "manual"}</span>
						<span class="pkg-status">
							{#if getStatus(dependency) === "loading"}
								<span class="badge badge--loading"><span class="spin-sm"></span></span>
							{:else if getStatus(dependency) === "ok"}
								<span class="badge badge--ok">{getLatest(dependency)}</span>
							{:else if getStatus(dependency) === "update"}
								<button class="badge badge--update" onclick={() => handleUpdate(dependency)}>
									↑ {getLatest(dependency)}
								</button>
							{:else if getStatus(dependency) === "manual"}
								<span class="badge badge--manual">review</span>
							{:else}
								<span class="badge badge--error">✕</span>
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
	requestedName={selectedDependency?.name || ""}
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
	.editor__meta,
	.editor__metaLeft,
	.editor__metaRight,
	.pkg-line,
	.pkg-status,
	.badge,
	.install-btn,
	.stat {
		display: flex;
		align-items: center;
	}
	.editor__meta {
		justify-content: space-between;
		gap: 12px;
		padding: 10px 18px;
		background: rgba(0, 0, 0, 0.3);
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
	}
	.editor__metaLeft,
	.editor__metaRight,
	.pkg-status,
	.badge,
	.install-btn,
	.stat {
		gap: 8px;
	}
	.meta__filename {
		font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
		color: var(--text-secondary, rgba(255, 255, 255, 0.55));
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
		font-family: "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
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
	.pkg-name {
		padding: 0;
		border: 0;
		background: transparent;
		font: inherit;
		cursor: pointer;
		text-align: left;
		color: inherit;
	}
	.pkg-status {
		margin-left: 14px;
		font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
		font-size: 11px;
	}
	.badge {
		height: 19px;
		padding: 1px 7px;
		font-weight: 500;
	}
	.badge--ok {
		color: rgba(52, 199, 89, 0.85);
		background: rgba(52, 199, 89, 0.1);
		border: 1px solid rgba(52, 199, 89, 0.18);
	}
	.badge--update {
		color: rgba(41, 182, 246, 0.95);
		background: rgba(41, 182, 246, 0.12);
		border: 1px solid rgba(41, 182, 246, 0.3);
		cursor: pointer;
	}
	.badge--error,
	.badge--loading,
	.badge--manual {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}
	.install-btn {
		padding: 3px 12px;
		border: 1px solid rgba(255, 159, 10, 0.35);
		background: rgba(255, 159, 10, 0.12);
		color: rgba(255, 159, 10, 0.95);
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
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
