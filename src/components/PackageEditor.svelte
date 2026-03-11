<script>
	import { toast } from "svelte-sonner";
	import { fetchPackagesInfo } from "../api";
	import {
		updatePackageVersion,
		getProjectPackages,
		checkLockFile,
		runInstall,
	} from "../utils/shell.js";

	/**
	 * Props:
	 *   project   – { id, name, path }
	 *   rawJson   – raw string content of package.json
	 *   onRefresh – callback(newRawJson) called after a version update
	 */
	let { project, rawJson, onRefresh = () => {} } = $props();

	let pkg = $derived.by(() => {
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
		// Touch reactive deps
		const _ = rawJson;
		infoMap = {};

		const allNames = [
			...Object.keys(pkg.dependencies ?? {}),
			...Object.keys(pkg.devDependencies ?? {}),
		];

		if (allNames.length === 0) return;

		const initial = {};
		for (const n of allNames) initial[n] = { status: "loading" };
		infoMap = initial;

		fetchPackagesInfo(allNames, (name, data) => {
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
			const updated = await updatePackageVersion(
				project.path,
				pkgName,
				latestVersion,
				isDev,
			);
			toast.success(`Updated ${pkgName}`, {
				description: `→ ${updated}`,
				position: "bottom-center",
			});
			// Re-read file and notify parent so the editor view refreshes
			try {
				const newRaw = await getProjectPackages(project.path);
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

	let stats = $derived.by(() => {
		let total = 0,
			outdated = 0,
			loading = 0;
		for (const [name, raw] of Object.entries(pkg.dependencies ?? {})) {
			total++;
			const s = getStatus(name, raw);
			if (s === "loading") loading++;
			if (s === "update") outdated++;
		}
		for (const [name, raw] of Object.entries(pkg.devDependencies ?? {})) {
			total++;
			const s = getStatus(name, raw);
			if (s === "loading") loading++;
			if (s === "update") outdated++;
		}
		return { total, outdated, loading };
	});

	let lockStatus = $state("ok"); // "ok" | "stale" | "missing"
	let installing = $state(false);

	$effect(() => {
		const _ = rawJson; // re-check when rawJson changes
		if (project?.path) {
			lockStatus = checkLockFile(project.path);
		}
	});

	async function handleInstall() {
		installing = true;
		try {
			await runInstall(project.path);
			lockStatus = checkLockFile(project.path);
			toast.success("Install complete", { position: "bottom-center" });
		} catch (err) {
			toast.error("Install failed", {
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
			<span class="meta__filename">package.json</span>
			{#if pkg.name}
				<span class="meta__dot">·</span>
				<span class="meta__name">{pkg.name}</span>
			{/if}
			{#if pkg.version}
				<span class="meta__version">v{pkg.version}</span>
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
			{#if pkg.name}<div class="line">
					<span class="tok-key">&nbsp;&nbsp;"name"</span><span class="tok-colon"
						>:
					</span><span class="tok-str">"{pkg.name}"</span><span
						class="tok-comma">,</span
					>
				</div>{/if}
			{#if pkg.version}<div class="line">
					<span class="tok-key">&nbsp;&nbsp;"version"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-str">"{pkg.version}"</span><span
						class="tok-comma">,</span
					>
				</div>{/if}
			{#if pkg.description}<div class="line">
					<span class="tok-key">&nbsp;&nbsp;"description"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-str">"{pkg.description}"</span><span
						class="tok-comma">,</span
					>
				</div>{/if}
			{#if pkg.dependencies && Object.keys(pkg.dependencies).length > 0}
				<div class="line">
					<span class="tok-section">&nbsp;&nbsp;"dependencies"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-brace">{"{"}</span>
				</div>
				{#each Object.entries(pkg.dependencies) as [name, ver], i}
					<div class="line pkg-line">
						<span class="tok-pkg">&nbsp;&nbsp;&nbsp;&nbsp;"{name}"</span><span
							class="tok-colon"
							>:
						</span><span class="tok-ver">"{ver}"</span
						>{#if i < Object.keys(pkg.dependencies).length - 1}<span
								class="tok-comma">,</span
							>{/if}<span class="pkg-status"
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
								href={`https://www.npmjs.com/package/${name}`}
								title="npm"
								><svg viewBox="0 0 16 16" fill="currentColor"
									><path
										d="M0 5h16v6H8v1H5v-1H0zm1 1v4h3V7h1v3h1V6zm5 0v5h2V7h2v4h1V6zm5 0v4h1V7h1v3h1V6z"
									/></svg
								></a
							>{#if infoMap[name]?.bugs?.url}<a
									class="link-icon"
									href={infoMap[name].bugs.url}
									title="Issues"
									><svg
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										><circle cx="8" cy="8" r="6.5" /><line
											x1="8"
											y1="5.5"
											x2="8"
											y2="8.5"
										/><line x1="8" y1="10.5" x2="8.01" y2="10.5" /></svg
									></a
								>{/if}</span
						>
					</div>
				{/each}
				<div class="line">
					<span class="tok-brace">&nbsp;&nbsp;{"}"}</span><span
						class="tok-comma">,</span
					>
				</div>
			{/if}
			{#if pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0}
				<div class="line">
					<span class="tok-section">&nbsp;&nbsp;"devDependencies"</span><span
						class="tok-colon"
						>:
					</span><span class="tok-brace">{"{"}</span>
				</div>
				{#each Object.entries(pkg.devDependencies) as [name, ver], i}
					<div class="line pkg-line">
						<span class="tok-pkg">&nbsp;&nbsp;&nbsp;&nbsp;"{name}"</span><span
							class="tok-colon"
							>:
						</span><span class="tok-ver tok-ver--dev">"{ver}"</span
						>{#if i < Object.keys(pkg.devDependencies).length - 1}<span
								class="tok-comma">,</span
							>{/if}<span class="pkg-status"
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
								href={`https://www.npmjs.com/package/${name}`}
								title="npm"
								><svg viewBox="0 0 16 16" fill="currentColor"
									><path
										d="M0 5h16v6H8v1H5v-1H0zm1 1v4h3V7h1v3h1V6zm5 0v5h2V7h2v4h1V6zm5 0v4h1V7h1v3h1V6z"
									/></svg
								></a
							>{#if infoMap[name]?.bugs?.url}<a
									class="link-icon"
									href={infoMap[name].bugs.url}
									title="Issues"
									><svg
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										><circle cx="8" cy="8" r="6.5" /><line
											x1="8"
											y1="5.5"
											x2="8"
											y2="8.5"
										/><line x1="8" y1="10.5" x2="8.01" y2="10.5" /></svg
									></a
								>{/if}</span
						>
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
	} /* blue – regular JSON keys */
	.tok-section {
		color: #e06c75;
		font-weight: 600;
	} /* red – section headers */
	.tok-str {
		color: #98c379;
	} /* green – generic string values */
	.tok-pkg {
		color: #c9d1d9;
	} /* light – package names */
	.tok-ver {
		color: #f8c555;
	} /* gold – prod versions */
	.tok-ver--dev {
		color: #ce9178;
	} /* orange – dev versions */

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
