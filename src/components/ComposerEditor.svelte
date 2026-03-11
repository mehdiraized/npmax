<script>
	import { toast } from "svelte-sonner";
	import { fetchComposerPackagesInfo } from "../api/composer.js";
	import {
		updateComposerPackageVersion,
		getProjectComposerPackages,
		checkComposerLockFile,
		runComposerInstall,
	} from "../utils/shell.js";

	/**
	 * Props:
	 *   project   – { id, name, path }
	 *   rawJson   – raw string content of composer.json
	 *   onRefresh – callback(newRawJson) called after a version update
	 */
	let { project, rawJson, onRefresh = () => {} } = $props();

	let composer = $derived.by(() => {
		try {
			return JSON.parse(rawJson);
		} catch {
			return {};
		}
	});

	let infoMap = $state({});

	const SEMVER_PREFIX_RE = /^(\^|~|>=|<=|>|<|=)\s*/;

	function normalizeVersionConstraint(raw) {
		if (typeof raw !== "string") return null;
		const trimmed = raw.trim();
		const normalized = trimmed.replace(SEMVER_PREFIX_RE, "").trim();
		return /^\d/.test(normalized) ? normalized : null;
	}

	$effect(() => {
		const _ = rawJson;
		infoMap = {};

		// Exclude PHP itself and extension constraints (e.g. "php", "ext-json")
		const isRealPackage = (name) =>
			name !== "php" && !name.startsWith("ext-") && !name.startsWith("lib-");

		const allNames = [
			...Object.keys(composer.require ?? {}).filter(isRealPackage),
			...Object.keys(composer["require-dev"] ?? {}).filter(isRealPackage),
		];

		if (allNames.length === 0) return;

		const initial = {};
		for (const n of allNames) initial[n] = { status: "loading" };
		infoMap = initial;

		fetchComposerPackagesInfo(allNames, (name, data) => {
			infoMap = {
				...infoMap,
				[name]: data
					? { status: data.version ? "fetched" : "error", ...data }
					: { status: "error" },
			};
		});
	});

	function getStatus(pkgName, currentRaw) {
		const info = infoMap[pkgName];
		if (!info || info.status === "loading") return "loading";
		if (info.status === "error") return "error";
		const latest = info.version;
		if (!latest) return "error";
		const current = normalizeVersionConstraint(currentRaw);
		return current === latest ? "ok" : "update";
	}

	function getLatest(pkgName) {
		return infoMap[pkgName]?.version ?? null;
	}

	async function handleUpdate(pkgName, latestVersion, isDev) {
		try {
			const updated = await updateComposerPackageVersion(
				project.path,
				pkgName,
				latestVersion,
				isDev,
			);
			toast.success(`Updated ${pkgName}`, {
				description: `→ ${updated}`,
				position: "bottom-center",
			});
			try {
				const newRaw = await getProjectComposerPackages(project.path);
				onRefresh(newRaw);
			} catch {
				/* ignore read error */
			}

			infoMap = {
				...infoMap,
				[pkgName]: { ...infoMap[pkgName], status: "fetched" },
			};
		} catch (err) {
			toast.error(`Failed to update ${pkgName}`, {
				description: err.message,
				position: "bottom-center",
			});
		}
	}

	// Only count packages we actually fetch info for (not php/ext-*)
	const isRealPackage = (name) =>
		name !== "php" && !name.startsWith("ext-") && !name.startsWith("lib-");

	let stats = $derived.by(() => {
		let total = 0,
			outdated = 0,
			loading = 0;
		for (const [name, raw] of Object.entries(composer.require ?? {})) {
			if (!isRealPackage(name)) continue;
			total++;
			const s = getStatus(name, raw);
			if (s === "loading") loading++;
			if (s === "update") outdated++;
		}
		for (const [name, raw] of Object.entries(composer["require-dev"] ?? {})) {
			if (!isRealPackage(name)) continue;
			total++;
			const s = getStatus(name, raw);
			if (s === "loading") loading++;
			if (s === "update") outdated++;
		}
		return { total, outdated, loading };
	});

	let lockStatus = $state("ok");
	let installing = $state(false);

	$effect(() => {
		const _ = rawJson;
		if (project?.path) {
			lockStatus = checkComposerLockFile(project.path);
		}
	});

	async function handleInstall() {
		installing = true;
		try {
			await runComposerInstall(project.path);
			lockStatus = checkComposerLockFile(project.path);
			toast.success("composer install complete", { position: "bottom-center" });
		} catch (err) {
			toast.error("composer install failed", {
				description: err.message,
				position: "bottom-center",
			});
		} finally {
			installing = false;
		}
	}
</script>

<div class="editor">
	<div class="editor__meta">
		<div class="editor__metaLeft">
			<span class="meta__filename">composer.json</span>
			{#if composer.name}
				<span class="meta__dot">·</span>
				<span class="meta__name">{composer.name}</span>
			{/if}
			{#if composer.version}
				<span class="meta__version">v{composer.version}</span>
			{/if}
		</div>
		<div class="editor__metaRight">
			{#if lockStatus === "stale" || lockStatus === "missing"}
				<button
					class="install-btn"
					onclick={handleInstall}
					disabled={installing}
				>
					{#if installing}
						<span class="spin"></span> Installing…
					{:else}
						<svg
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							width="12"
							height="12"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" /></svg
						>
						{lockStatus === "missing" ? "Install" : "Sync"}
					{/if}
				</button>
			{/if}
			{#if stats.loading > 0}
				<span class="stat stat--loading">
					<span class="spin"></span>
					Checking {stats.loading}…
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
			<div class="line"><span class="tok-brace">{"{"}</span></div>

			{#if composer.name}<div class="line">
					<span class="tok-key">&nbsp;&nbsp;"name"</span><span class="tok-colon"
						>:
					</span><span class="tok-str">"{composer.name}"</span><span
						class="tok-comma">,</span
					>
				</div>{/if}
			{#if composer.description}<div class="line">
					<span class="tok-key">&nbsp;&nbsp;"description"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-str">"{composer.description}"</span><span
						class="tok-comma">,</span
					>
				</div>{/if}
			{#if composer.require && Object.keys(composer.require).length > 0}
				<div class="line">
					<span class="tok-section">&nbsp;&nbsp;"require"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-brace">{"{"}</span>
				</div>
				{#each Object.entries(composer.require) as [name, ver], i}
					{@const isReal = isRealPackage(name)}
					<div class="line pkg-line">
						<span class="tok-pkg">&nbsp;&nbsp;&nbsp;&nbsp;"{name}"</span><span
							class="tok-colon"
							>:
						</span><span class="tok-ver">"{ver}"</span
						>{#if i < Object.keys(composer.require).length - 1}<span
								class="tok-comma">,</span
							>{/if}{#if isReal}<span class="pkg-status"
							>{#if getStatus(name, ver) === "loading"}<span
									class="badge badge--loading"
									><span class="spin-sm"></span></span
								>{:else if getStatus(name, ver) === "ok"}<span
									class="badge badge--ok"
									><svg
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										><polyline points="13 4 6.5 11 3 7.5" /></svg
									>{getLatest(name)}</span
								>{:else if getStatus(name, ver) === "update"}<button
									class="badge badge--update"
									onclick={() => handleUpdate(name, getLatest(name), false)}
									>↑ {getLatest(name)}</button
								>{:else}<span class="badge badge--error">✕</span
								>{/if}{#if infoMap[name]?.homepage}<a
									class="link-icon"
									href={infoMap[name].homepage}
									title="Homepage"
									><svg
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										><circle cx="8" cy="8" r="6.5" /><path
											d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13"
										/></svg
									></a
								>{/if}<a
								class="link-icon"
								href={`https://packagist.org/packages/${name}`}
								title="Packagist"
								><svg viewBox="0 0 16 16" fill="currentColor"
									><path
										d="M8 1 L14 4.5 L14 11.5 L8 15 L2 11.5 L2 4.5 Z"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									/><text
										x="8"
										y="10.5"
										text-anchor="middle"
										font-size="6"
										font-weight="700"
										fill="currentColor">P</text
									></svg
								></a
							></span
						>{/if}
					</div>
				{/each}
				<div class="line">
					<span class="tok-brace">&nbsp;&nbsp;{"}"}</span><span
						class="tok-comma">,</span
					>
				</div>
			{/if}

			{#if composer["require-dev"] && Object.keys(composer["require-dev"]).length > 0}
				<div class="line">
					<span class="tok-section">&nbsp;&nbsp;"require-dev"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-brace">{"{"}</span>
				</div>
				{#each Object.entries(composer["require-dev"]) as [name, ver], i}
					{@const isReal = isRealPackage(name)}
					<div class="line pkg-line">
						<span class="tok-pkg">&nbsp;&nbsp;&nbsp;&nbsp;"{name}"</span><span
							class="tok-colon"
							>:
						</span><span class="tok-ver tok-ver--dev">"{ver}"</span
						>{#if i < Object.keys(composer["require-dev"]).length - 1}<span
								class="tok-comma">,</span
							>{/if}{#if isReal}<span class="pkg-status"
							>{#if getStatus(name, ver) === "loading"}<span
									class="badge badge--loading"
									><span class="spin-sm"></span></span
								>{:else if getStatus(name, ver) === "ok"}<span
									class="badge badge--ok"
									><svg
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										><polyline points="13 4 6.5 11 3 7.5" /></svg
									>{getLatest(name)}</span
								>{:else if getStatus(name, ver) === "update"}<button
									class="badge badge--update"
									onclick={() => handleUpdate(name, getLatest(name), true)}
									>↑ {getLatest(name)}</button
								>{:else}<span class="badge badge--error">✕</span
								>{/if}{#if infoMap[name]?.homepage}<a
									class="link-icon"
									href={infoMap[name].homepage}
									title="Homepage"
									><svg
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										><circle cx="8" cy="8" r="6.5" /><path
											d="M8 1.5A9.5 9.5 0 0 1 11 8 9.5 9.5 0 0 1 8 14.5M8 1.5A9.5 9.5 0 0 0 5 8 9.5 9.5 0 0 0 8 14.5M1.5 8h13"
										/></svg
									></a
								>{/if}<a
								class="link-icon"
								href={`https://packagist.org/packages/${name}`}
								title="Packagist"
								><svg viewBox="0 0 16 16" fill="currentColor"
									><path
										d="M8 1 L14 4.5 L14 11.5 L8 15 L2 11.5 L2 4.5 Z"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									/><text
										x="8"
										y="10.5"
										text-anchor="middle"
										font-size="6"
										font-weight="700"
										fill="currentColor">P</text
									></svg
								></a
							></span
						>{/if}
					</div>
				{/each}
				<div class="line"><span class="tok-brace">&nbsp;&nbsp;{"}"}</span></div>
			{/if}

			<div class="line"><span class="tok-brace">{"}"}</span></div>
		</div>
	</div>
</div>

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

	.editor__metaLeft {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 12px;
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

	.meta__version {
		font-size: 11px;
		padding: 1px 7px;
		border-radius: 99px;
		background: rgba(91, 156, 246, 0.12);
		color: rgba(91, 156, 246, 0.8);
		border: 1px solid rgba(91, 156, 246, 0.2);
		font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
	}

	.editor__metaRight {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.stat {
		font-size: 11px;
		padding: 2px 9px;
		border-radius: 99px;
		display: flex;
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
		height: 28px;
		white-space: nowrap;
	}

	.tok-brace {
		color: rgba(255, 255, 255, 0.4);
	}
	.tok-colon {
		color: rgba(255, 255, 255, 0.3);
	}
	.tok-comma {
		color: rgba(255, 255, 255, 0.25);
	}
	.tok-key {
		color: #9ecbff;
	}
	.tok-section {
		color: #e06c75;
		font-weight: 600;
	}
	.tok-str {
		color: #98c379;
	}
	.tok-pkg {
		color: #c9d1d9;
	}
	.tok-ver {
		color: #f8c555;
	}
	.tok-ver--dev {
		color: #ce9178;
	}

	.pkg-line {
		display: inline-flex;
		align-items: center;
		width: 100%;
		min-height: 26px;
		gap: 0;
		flex-wrap: nowrap;
		white-space: pre;
	}

	.pkg-status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-left: 14px;
		white-space: nowrap;
		font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
		font-size: 11px;
	}

	.badge {
		display: inline-flex;
		height: 19px;
		align-items: center;
		gap: 4px;
		padding: 1px 7px;
		border-radius: 99px;
		font-size: 11px;
		font-weight: 500;

		svg {
			width: 11px;
			height: 11px;
		}
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
		transition: all 0.3s ease-in-out;
		cursor: pointer;

		&:hover {
			background: rgba(41, 182, 246, 0.25);
			box-shadow: 0 0 10px rgba(41, 182, 246, 0.35);
		}
	}

	.badge--error {
		color: rgba(255, 80, 80, 0.7);
		background: rgba(255, 80, 80, 0.08);
		border: 1px solid rgba(255, 80, 80, 0.15);
	}

	.badge--loading {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 3px 8px;
	}

	.install-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 12px;
		border-radius: 99px;
		border: 1px solid rgba(255, 159, 10, 0.35);
		background: rgba(255, 159, 10, 0.12);
		color: rgba(255, 159, 10, 0.95);
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s ease;

		&:hover {
			background: rgba(255, 159, 10, 0.25);
			box-shadow: 0 0 10px rgba(255, 159, 10, 0.2);
		}

		&:active {
			transform: scale(0.95);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.link-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 5px;
		color: var(--text-muted, rgba(255, 255, 255, 0.28));
		background: rgba(255, 255, 255, 0.05);
		transition: all 0.15s ease;

		svg {
			width: 12px;
			height: 12px;
		}

		&:hover {
			color: var(--text-primary, rgba(255, 255, 255, 0.9));
			background: rgba(255, 255, 255, 0.1);
		}
	}

	.spin {
		display: inline-block;
		width: 10px;
		height: 10px;
		border: 1.5px solid rgba(255, 255, 255, 0.15);
		border-top-color: rgba(255, 255, 255, 0.6);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	.spin-sm {
		display: inline-block;
		width: 9px;
		height: 9px;
		border: 1.5px solid rgba(255, 255, 255, 0.12);
		border-top-color: rgba(255, 255, 255, 0.5);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
