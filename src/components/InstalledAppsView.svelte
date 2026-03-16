<script>
	import { onDestroy, onMount } from "svelte";
	import { shell } from "electron";
	import axios from "axios";
	import { enrichAppsWithRemoteVersions } from "../api/systemApps.js";
	import { getInstalledAppsInventory } from "../utils/systemApps.js";

	const { ipcRenderer } = require("electron");

	let apps = $state([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state("");
	let query = $state("");
	let filter = $state("updates");
	let sortMode = $state("updates");
	let remoteChecksPending = $state(0);
	let lastScannedAt = $state(null);

	// App icons
	let icons = $state({});
	let iconQueue = [];
	let iconProcessing = false;

	// GitHub issues
	let githubToken = $state(localStorage.getItem("npmax-gh-token") || "");
	let showTokenInput = $state(false);
	let tokenDraft = $state("");
	let creatingIssues = $state(false);
	let issuesDone = $state(null); // { created, skipped, failed }

	const triggerRefresh = () => void loadApps({ silent: false });

	const filteredApps = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return apps
			.filter((app) => {
				if (filter === "updates" && !app.updateAvailable) return false;
				if (filter === "supported" && !app.catalogId) return false;
				if (filter === "unsupported" && app.catalogId) return false;
				if (!q) return true;
				return [
					app.name,
					app.version,
					app.latestVersion,
					app.source,
					app.publisher,
				]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q));
			})
			.sort((a, b) => {
				if (sortMode === "name") return a.name.localeCompare(b.name);
				if (sortMode === "installed")
					return (b.version ? 1 : 0) - (a.version ? 1 : 0);
				if (a.updateAvailable !== b.updateAvailable)
					return a.updateAvailable ? -1 : 1;
				return a.name.localeCompare(b.name);
			});
	});

	const summary = $derived.by(() => ({
		total: apps.length,
		updates: apps.filter((a) => a.updateAvailable).length,
		supported: apps.filter((a) => a.catalogId).length,
		unmatched: apps.filter((a) => !a.catalogId).length,
	}));

	async function loadApps({ silent = true } = {}) {
		error = "";
		remoteChecksPending = 0;
		if (silent) refreshing = true;
		else loading = true;

		try {
			const inventory = await getInstalledAppsInventory();
			apps = inventory;
			lastScannedAt = new Date().toISOString();
			enqueueIcons(inventory);

			const candidates = inventory.filter(
				(a) => !a.updateAvailable && a.catalogId && a.version,
			);
			remoteChecksPending = candidates.length;

			await enrichAppsWithRemoteVersions(inventory, (id, payload) => {
				remoteChecksPending = Math.max(0, remoteChecksPending - 1);
				if (!payload) return;
				apps = apps.map((app) => {
					if (app.id !== id) return app;
					return {
						...app,
						latestVersion: payload.latestVersion || app.latestVersion,
						updateUrl: payload.updateUrl || app.updateUrl,
						updateSource: payload.updateSource || app.updateSource,
						updateConfidence: payload.updateConfidence || app.updateConfidence,
						updateAvailable: payload.status === "outdated",
						status: payload.status || app.status,
					};
				});
			});
		} catch (err) {
			error = err.message || "Failed to scan installed apps.";
			remoteChecksPending = 0;
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	// ── Icon loading ─────────────────────────
	function enqueueIcons(inventory) {
		for (const app of inventory) {
			if (app.path && !(app.id in icons)) {
				iconQueue.push(app);
			}
		}
		if (!iconProcessing) processIconBatch();
	}

	async function processIconBatch() {
		iconProcessing = true;
		const BATCH = 20;
		while (iconQueue.length > 0) {
			const batch = iconQueue.splice(0, BATCH);
			const results = await Promise.all(
				batch.map((app) =>
					ipcRenderer.invoke("get-file-icon", app.path).catch(() => null),
				),
			);
			const updates = {};
			batch.forEach((app, i) => {
				updates[app.id] = results[i] || null;
			});
			icons = { ...icons, ...updates };
			await new Promise((r) => setTimeout(r, 16));
		}
		iconProcessing = false;
	}

	// ── GitHub issues ─────────────────────────
	function saveToken() {
		githubToken = tokenDraft.trim();
		localStorage.setItem("npmax-gh-token", githubToken);
		showTokenInput = false;
		tokenDraft = "";
	}

	function clearToken() {
		githubToken = "";
		localStorage.removeItem("npmax-gh-token");
	}

	async function createCatalogIssues() {
		if (!githubToken) {
			tokenDraft = "";
			showTokenInput = true;
			return;
		}

		const unmatched = apps.filter((a) => !a.catalogId);
		if (unmatched.length === 0) return;

		creatingIssues = true;
		issuesDone = null;

		let created = 0;
		let skipped = 0;
		let failed = 0;

		for (const app of unmatched) {
			try {
				const body = [
					"## App Details",
					`- **Name:** ${app.name}`,
					`- **Installed version:** ${app.version || "Unknown"}`,
					`- **Path:** ${app.path || "Unknown"}`,
					`- **Source:** ${app.source || "system"}`,
					`- **Publisher:** ${app.publisher || "Unknown"}`,
					"",
					"## Task",
					"Add this app to `src/data/appCatalog.js` to enable automatic version checking.",
					"",
					"---",
					"*Auto-generated by npMax installed apps scanner*",
				].join("\n");

				await axios.post(
					"https://api.github.com/repos/mehdiraized/npmax/issues",
					{
						title: `[App Catalog] Add support for "${app.name}"`,
						body,
						labels: ["app-catalog"],
					},
					{
						headers: {
							Authorization: `Bearer ${githubToken}`,
							Accept: "application/vnd.github+json",
						},
					},
				);
				created++;
			} catch (e) {
				if (e?.response?.status === 422) skipped++;
				else failed++;
			}
		}

		creatingIssues = false;
		issuesDone = { created, skipped, failed };
	}

	// ── Helpers ───────────────────────────────
	function formatTime(value) {
		if (!value) return "Not scanned yet";
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(value));
	}

	function sourceLabel(app) {
		const map = {
			"brew-cask": "Homebrew",
			winget: "winget",
			flatpak: "Flatpak",
			snap: "Snap",
			registry: "Registry",
			"desktop-entry": ".desktop",
			apple: "Apple",
			identified_developer: "Developer",
		};
		return map[app.source] || app.source || "System";
	}

	function openAppLink(app) {
		const target = app.updateUrl || app.website;
		if (target) void shell.openExternal(target);
	}

	onMount(() => {
		void loadApps({ silent: false });
		window.addEventListener("npmax:refresh-installed-apps", triggerRefresh);
	});

	onDestroy(() => {
		window.removeEventListener("npmax:refresh-installed-apps", triggerRefresh);
	});
</script>

<div class="view">
	<!-- Header -->
	<header class="hdr">
		<div>
			<h1 class="hdr__title">Installed Apps</h1>
		</div>
		<div class="hdr__right">
			{#if lastScannedAt}
				<span class="hdr__time">Scanned {formatTime(lastScannedAt)}</span>
			{/if}
			<button
				class="btn btn--ghost"
				onclick={() => loadApps({ silent: true })}
				disabled={loading || refreshing}
			>
				{#if loading || refreshing}
					<span class="spin"></span> Scanning…
				{:else}
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
					>
						<polyline points="23 4 23 10 17 10" /><path
							d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
						/>
					</svg>
					Refresh
				{/if}
			</button>
		</div>
	</header>
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="search-wrap">
			<svg
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="8" /><line
					x1="21"
					y1="21"
					x2="16.65"
					y2="16.65"
				/>
			</svg>
			<input
				class="search-wrap__input"
				bind:value={query}
				placeholder="Search app, version, source…"
			/>
		</div>
		<div class="toolbar__right">
			<select bind:value={sortMode} class="select">
				<option value="updates">Updates first</option>
				<option value="name">A → Z</option>
				<option value="installed">Installed version</option>
			</select>
			{#if filter === "unsupported" && summary.unmatched > 0}
				<button
					class="btn btn--accent"
					onclick={createCatalogIssues}
					disabled={creatingIssues}
				>
					{#if creatingIssues}
						<span class="spin"></span> Creating issues…
					{:else}
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" /><line
								x1="12"
								y1="8"
								x2="12"
								y2="12"
							/><line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						Report {summary.unmatched} to GitHub
					{/if}
				</button>
			{/if}
		</div>
	</div>

	<!-- Tabs -->
	<div class="tabs">
		<button
			class="tab"
			class:tab--active={filter === "all"}
			onclick={() => (filter = "all")}
		>
			All
			<span class="tab__badge">{summary.total}</span>
		</button>
		<button
			class="tab"
			class:tab--active={filter === "updates"}
			onclick={() => (filter = "updates")}
		>
			Updates
			{#if summary.updates > 0}<span class="tab__badge tab__badge--blue"
					>{summary.updates}</span
				>{/if}
		</button>
		<button
			class="tab"
			class:tab--active={filter === "supported"}
			onclick={() => (filter = "supported")}
		>
			In Catalog
			<span class="tab__badge">{summary.supported}</span>
		</button>
		<button
			class="tab"
			class:tab--active={filter === "unsupported"}
			onclick={() => (filter = "unsupported")}
		>
			Unmatched
			<span class="tab__badge">{summary.unmatched}</span>
		</button>
	</div>

	<!-- Token input banner -->
	{#if showTokenInput}
		<div class="token-banner">
			<span class="token-banner__label"
				>Enter a GitHub personal access token to create issues:</span
			>
			<input
				class="token-banner__input"
				type="password"
				bind:value={tokenDraft}
				placeholder="ghp_…"
				onkeydown={(e) => e.key === "Enter" && saveToken()}
			/>
			<button
				class="btn btn--accent"
				onclick={saveToken}
				disabled={!tokenDraft.trim()}>Save</button
			>
			<button class="btn btn--ghost" onclick={() => (showTokenInput = false)}
				>Cancel</button
			>
		</div>
	{/if}

	<!-- Issue results banner -->
	{#if issuesDone}
		<div class="result-banner">
			<span>
				{issuesDone.created} issues created
				{#if issuesDone.skipped > 0}, {issuesDone.skipped} already existed{/if}
				{#if issuesDone.failed > 0}, {issuesDone.failed} failed{/if}
			</span>
			<button class="btn btn--ghost" onclick={() => (issuesDone = null)}
				>Dismiss</button
			>
			{#if githubToken}
				<button class="btn btn--ghost" onclick={clearToken}>Clear token</button>
			{/if}
		</div>
	{/if}

	<!-- Body -->
	<div class="body">
		{#if error}
			<div class="notice notice--error">{error}</div>
		{:else if loading}
			<div class="notice">
				<span class="spin spin--lg"></span>
				Scanning installed apps across this machine…
			</div>
		{:else}
			<div class="body__bar">
				{#if remoteChecksPending > 0}
					<span class="body__pending">
						<span class="spin"></span>
						Checking {remoteChecksPending} catalog sources…
					</span>
				{/if}
			</div>

			<div class="grid">
				{#if filteredApps.length === 0}
					<div class="grid__empty">
						{#if filter === "updates"}
							<svg
								width="32"
								height="32"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.4"
							>
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
									points="22 4 12 14.01 9 11.01"
								/>
							</svg>
							<p>All apps are up to date</p>
						{:else}
							<p>No apps matched this filter</p>
						{/if}
					</div>
				{:else}
					{#each filteredApps as app}
						<article class="card" class:card--outdated={app.updateAvailable}>
							<div class="card__head">
								<div class="card__icon">
									{#if icons[app.id]}
										<img src={icons[app.id]} alt="" width="32" height="32" />
									{:else}
										<svg
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.4"
										>
											<rect x="3" y="3" width="18" height="18" rx="4" />
											<circle cx="12" cy="10" r="3" />
											<path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
										</svg>
									{/if}
								</div>
								<div class="card__meta">
									<h3 class="card__name">{app.name}</h3>
									<span class="card__source">{sourceLabel(app)}</span>
								</div>
								{#if app.updateAvailable}
									<span class="badge badge--blue">Update</span>
								{:else if app.status === "current"}
									<span class="badge badge--dim">Current</span>
								{/if}
							</div>

							<div class="card__vers">
								<div class="card__ver">
									<span>Installed</span>
									<strong>{app.version || "—"}</strong>
								</div>
								<div class="card__verSep"></div>
								<div class="card__ver card__ver--r">
									<span>Latest</span>
									<strong class:card__ver__new={app.updateAvailable}>
										{app.latestVersion ||
											(remoteChecksPending > 0 && app.catalogId ? "…" : "—")}
									</strong>
								</div>
							</div>

							<div class="card__foot">
								<div class="card__footRow">
									<div class="card__tags">
										{#if app.catalogId}<span class="tag tag--blue">catalog</span
											>{/if}
										{#if app.publisher}<span class="tag">{app.publisher}</span
											>{/if}
									</div>
									{#if app.updateUrl || app.website}
										<button class="card__link" onclick={() => openAppLink(app)}
											>↗</button
										>
									{/if}
								</div>
								{#if app.updateCommand}
									<code class="card__cmd">{app.updateCommand}</code>
								{/if}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.view {
		flex: 1;
		min-width: 0;
		height: 100vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		padding: 0 24px;
		gap: 12px;
	}

	/* ── Header ─────────────────────────────── */
	.hdr {
		flex-shrink: 0;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		padding-top: 15px; // macOS titlebar offset
	}

	.hdr__title {
		font-size: 24px;
		font-weight: 700;
		line-height: 1;
	}

	.hdr__right {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-bottom: 2px;
	}

	.hdr__time {
		font-size: 11px;
		color: var(--text-muted);
	}

	/* ── Buttons ─────────────────────────────── */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-subtle);
		font-size: 12px;
		font-weight: 500;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast);

		&--ghost {
			background: var(--glass-light);
			color: var(--text-secondary);
			&:hover:not(:disabled) {
				background: var(--glass-medium);
				color: var(--text-primary);
			}
		}

		&--accent {
			background: var(--accent-subtle);
			border-color: rgba(91, 156, 246, 0.3);
			color: var(--accent-hover);
			&:hover:not(:disabled) {
				background: rgba(91, 156, 246, 0.2);
			}
		}

		&:disabled {
			opacity: 0.5;
			cursor: default;
		}
	}

	/* ── Stats ───────────────────────────────── */
	/* ── Tabs ────────────────────────────────── */
	.tabs {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border-radius: var(--radius-lg);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-subtle);
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 7px 14px;
		border-radius: var(--radius-md);
		border: 0;
		background: transparent;
		color: var(--text-muted);
		font-size: 13px;
		font-weight: 500;
		flex: 1;
		justify-content: center;
		transition:
			background var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			color: var(--text-secondary);
			background: rgba(255, 255, 255, 0.04);
		}

		&--active {
			background: rgba(255, 255, 255, 0.1);
			color: var(--text-primary);
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		}
	}

	.tab__badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-muted);

		&--blue {
			background: rgba(91, 156, 246, 0.2);
			color: var(--accent-hover);
		}
	}

	/* ── Toolbar ─────────────────────────────── */
	.toolbar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-subtle);
		background: var(--glass-ultra);
		color: var(--text-muted);
		flex: 1;
		max-width: 320px;

		&__input {
			flex: 1;
			background: transparent;
			border: 0;
			color: var(--text-primary);
			font-size: 12px;
			&::placeholder {
				color: var(--text-muted);
			}
		}
	}

	.toolbar__right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.select {
		padding: 7px 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-subtle);
		background: var(--glass-ultra);
		color: var(--text-primary);
		font-size: 12px;
		appearance: auto;
	}

	/* ── Token / Result banners ──────────────── */
	.token-banner,
	.result-banner {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-light);
		background: var(--glass-medium);
		font-size: 12px;
		color: var(--text-secondary);
	}

	.token-banner__label {
		flex: 1;
		min-width: 0;
	}

	.token-banner__input {
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: rgba(0, 0, 0, 0.25);
		color: var(--text-primary);
		font-size: 12px;
		width: 220px;
	}

	/* ── Body / scroll ───────────────────────── */
	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-bottom: 24px;
	}

	.notice {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		height: 140px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-subtle);
		background: var(--glass-ultra);
		color: var(--text-secondary);
		font-size: 13px;

		&--error {
			border-color: rgba(255, 80, 80, 0.25);
			color: rgba(255, 160, 160, 0.9);
		}
	}

	.body__bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2px 10px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.body__pending {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* ── Grid ────────────────────────────────── */
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 8px;
	}

	.grid__empty {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 60px;
		color: var(--text-muted);
		font-size: 13px;
	}

	/* ── Card ────────────────────────────────── */
	.card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-subtle);
		background: var(--glass-ultra);
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			background: var(--glass-light);
		}

		&--outdated {
			border-color: rgba(91, 156, 246, 0.3);
			background: linear-gradient(
				150deg,
				rgba(91, 156, 246, 0.07),
				transparent
			);
			&:hover {
				background: linear-gradient(
					150deg,
					rgba(91, 156, 246, 0.12),
					var(--glass-light)
				);
			}
		}
	}

	.card__head {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.card__icon {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--glass-medium);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		overflow: hidden;

		img {
			width: 32px;
			height: 32px;
			border-radius: 6px;
		}
		svg {
			color: var(--text-muted);
		}
	}

	.card__meta {
		flex: 1;
		min-width: 0;
		padding-top: 2px;
	}

	.card__name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 2px;
	}

	.card__source {
		font-size: 11px;
		color: var(--text-muted);
	}

	.card__vers {
		display: flex;
		align-items: center;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		background: rgba(0, 0, 0, 0.15);
		border: 1px solid var(--border-subtle);
		gap: 0;
	}

	.card__ver {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;

		span {
			font-size: 9px;
			text-transform: uppercase;
			letter-spacing: 0.1em;
			color: var(--text-muted);
		}

		strong {
			font-size: 12px;
			font-weight: 600;
			color: var(--text-primary);
			word-break: break-all;
		}

		&__new {
			color: var(--accent-hover) !important;
		}
		&--r {
			text-align: right;
			align-items: flex-end;
		}
	}

	.card__verSep {
		width: 1px;
		height: 28px;
		background: var(--border-subtle);
		margin: 0 10px;
		flex-shrink: 0;
	}

	.card__foot {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: auto;
	}

	.card__footRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		min-width: 0;
	}

	.card__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.card__cmd {
		display: block;
		font-size: 10px;
		padding: 5px 8px;
		border-radius: var(--radius-sm);
		background: rgba(0, 0, 0, 0.25);
		color: var(--text-secondary);
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card__link {
		border: 0;
		background: transparent;
		color: var(--accent);
		font-size: 14px;
		padding: 0 2px;
		line-height: 1;
		&:hover {
			color: var(--accent-hover);
		}
	}

	/* ── Badge ───────────────────────────────── */
	.badge {
		flex-shrink: 0;
		padding: 3px 7px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 600;
		background: var(--glass-medium);
		color: var(--text-muted);
		white-space: nowrap;

		&--blue {
			background: rgba(91, 156, 246, 0.15);
			color: var(--accent-hover);
		}
		&--dim {
			background: rgba(255, 255, 255, 0.06);
			color: var(--text-muted);
		}
	}

	/* ── Tag ─────────────────────────────────── */
	.tag {
		padding: 2px 6px;
		border-radius: 999px;
		font-size: 10px;
		background: var(--glass-medium);
		color: var(--text-muted);
		&--blue {
			background: var(--accent-subtle);
			color: var(--accent);
		}
	}

	/* ── Spinner ─────────────────────────────── */
	.spin {
		display: inline-block;
		width: 11px;
		height: 11px;
		border-radius: 999px;
		border: 1.5px solid rgba(255, 255, 255, 0.2);
		border-top-color: rgba(255, 255, 255, 0.8);
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;

		&--lg {
			width: 18px;
			height: 18px;
			border-width: 2px;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 1100px) {
		.tabs {
			flex-wrap: wrap;
		}
		.toolbar {
			flex-direction: column;
			align-items: stretch;
		}
		.search-wrap {
			max-width: none;
		}
	}

	@media (max-width: 720px) {
		.view {
			padding: 0 14px;
		}
		.tab {
			font-size: 12px;
			padding: 6px 10px;
		}
	}
</style>
