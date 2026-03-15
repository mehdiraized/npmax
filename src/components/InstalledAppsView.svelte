<script>
	import { onDestroy, onMount } from "svelte";
	import { shell } from "electron";
	import SimpleBar from "./SimpleBar.svelte";
	import { enrichAppsWithRemoteVersions } from "../api/systemApps.js";
	import { getInstalledAppsInventory } from "../utils/systemApps.js";

	let apps = $state([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state("");
	let query = $state("");
	let filter = $state("all");
	let sortMode = $state("updates");
	let remoteChecksPending = $state(0);
	let lastScannedAt = $state(null);

	const triggerRefresh = () => {
		void loadApps({ silent: false });
	};

	const filteredApps = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return apps
			.filter((app) => {
				if (filter === "updates" && !app.updateAvailable) return false;
				if (filter === "supported" && !app.catalogId) return false;
				if (filter === "unsupported" && app.catalogId) return false;
				if (!normalizedQuery) return true;
				return [
					app.name,
					app.version,
					app.latestVersion,
					app.source,
					app.publisher,
				]
					.filter(Boolean)
					.some((value) => String(value).toLowerCase().includes(normalizedQuery));
			})
			.sort((left, right) => {
				if (sortMode === "name") return left.name.localeCompare(right.name);
				if (sortMode === "installed") {
					return (right.version ? 1 : 0) - (left.version ? 1 : 0);
				}
				if (left.updateAvailable !== right.updateAvailable) {
					return left.updateAvailable ? -1 : 1;
				}
				return left.name.localeCompare(right.name);
			});
	});

	const summary = $derived.by(() => {
		const total = apps.length;
		const updates = apps.filter((app) => app.updateAvailable).length;
		const supported = apps.filter((app) => app.catalogId).length;
		const verified = apps.filter((app) => app.updateConfidence === "verified").length;
		return { total, updates, supported, verified };
	});

	async function loadApps({ silent = true } = {}) {
		error = "";
		remoteChecksPending = 0;

		if (silent) {
			refreshing = true;
		} else {
			loading = true;
		}

		try {
			const inventory = await getInstalledAppsInventory();
			apps = inventory;
			lastScannedAt = new Date().toISOString();

			const candidates = inventory.filter(
				(item) => !item.updateAvailable && item.catalogId && item.version,
			);
			remoteChecksPending = candidates.length;

			await enrichAppsWithRemoteVersions(inventory, (id, payload) => {
				if (!payload) {
					remoteChecksPending = Math.max(0, remoteChecksPending - 1);
					return;
				}

				apps = apps.map((app) => {
					if (app.id !== id) return app;
					const updateAvailable = payload.status === "outdated";
					return {
						...app,
						latestVersion: payload.latestVersion || app.latestVersion,
						updateUrl: payload.updateUrl || app.updateUrl,
						updateSource: payload.updateSource || app.updateSource,
						updateConfidence: payload.updateConfidence || app.updateConfidence,
						updateAvailable,
						status: payload.status || app.status,
					};
				});
				remoteChecksPending = Math.max(0, remoteChecksPending - 1);
			});
		} catch (err) {
			error = err.message || "Failed to scan installed apps.";
			remoteChecksPending = 0;
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	function formatTime(value) {
		if (!value) return "Not scanned yet";
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(value));
	}

	function statusLabel(app) {
		if (app.updateAvailable) return "Update available";
		if (app.status === "current") return "Current";
		if (app.status === "ahead") return "Ahead";
		return "Monitoring";
	}

	function sourceLabel(app) {
		const labels = {
			"brew-cask": "Homebrew Cask",
			winget: "winget",
			flatpak: "Flatpak",
			snap: "Snap",
			registry: "Windows Registry",
			"desktop-entry": ".desktop",
			system: "System",
			apple: "Apple",
			identified_developer: "Developer",
		};
		return labels[app.source] || app.source || "System";
	}

	function openAppLink(app) {
		const target = app.updateUrl || app.website;
		if (!target) return;
		void shell.openExternal(target);
	}

	onMount(() => {
		void loadApps({ silent: false });
		window.addEventListener("npmax:refresh-installed-apps", triggerRefresh);
	});

	onDestroy(() => {
		window.removeEventListener("npmax:refresh-installed-apps", triggerRefresh);
	});
</script>

<section class="apps">
	<div class="apps__hero glass-card">
		<div class="apps__heroCopy">
			<div class="apps__eyebrow">Installed Apps</div>
			<h1>One place for every desktop app on the machine.</h1>
			<p>
				npMax v3 now scans the user’s system apps, highlights available updates,
				and keeps project dependency workflows intact in the same interface.
			</p>
		</div>
		<div class="apps__heroActions">
			<button class="apps__primaryBtn" onclick={() => loadApps({ silent: true })} disabled={loading || refreshing}>
				{#if loading || refreshing}
					<span class="spin"></span>
					Scanning…
				{:else}
					Refresh Scan
				{/if}
			</button>
			<div class="apps__timestamp">Last scan: {formatTime(lastScannedAt)}</div>
		</div>
	</div>

	<div class="apps__stats">
		<div class="statCard glass-card">
			<span>Total Apps</span>
			<strong>{summary.total}</strong>
		</div>
		<div class="statCard glass-card statCard--warm">
			<span>Updates Found</span>
			<strong>{summary.updates}</strong>
		</div>
		<div class="statCard glass-card">
			<span>Catalog Coverage</span>
			<strong>{summary.supported}</strong>
		</div>
		<div class="statCard glass-card">
			<span>Verified Sources</span>
			<strong>{summary.verified}</strong>
		</div>
	</div>

	<div class="apps__toolbar glass-card">
		<div class="apps__filters">
			<button class:chip--active={filter === "all"} class="chip" onclick={() => (filter = "all")}>All</button>
			<button class:chip--active={filter === "updates"} class="chip" onclick={() => (filter = "updates")}>Needs update</button>
			<button class:chip--active={filter === "supported"} class="chip" onclick={() => (filter = "supported")}>Catalog matched</button>
			<button class:chip--active={filter === "unsupported"} class="chip" onclick={() => (filter = "unsupported")}>Unmatched</button>
		</div>

		<div class="apps__controls">
			<input class="apps__search" bind:value={query} placeholder="Search app, version, source…" />
			<select bind:value={sortMode} class="apps__sort">
				<option value="updates">Sort by updates</option>
				<option value="name">Sort by name</option>
				<option value="installed">Sort by installed version</option>
			</select>
		</div>
	</div>

	{#if error}
		<div class="apps__message glass-card apps__message--error">{error}</div>
	{:else if loading}
		<div class="apps__message glass-card">Scanning installed apps across this machine…</div>
	{:else}
		<div class="apps__results glass-card">
			<div class="apps__resultsHeader">
				<div>
					<strong>{filteredApps.length} apps</strong>
					<span>shown from {summary.total}</span>
				</div>
				{#if remoteChecksPending > 0}
					<div class="apps__pending">
						<span class="spin"></span>
						Checking {remoteChecksPending} catalog sources…
					</div>
				{/if}
			</div>

			<SimpleBar maxHeight={"calc(100vh - 330px)"}>
				<div class="apps__grid">
					{#if filteredApps.length === 0}
						<div class="apps__empty">
							<h3>No apps matched this view</h3>
							<p>Try another filter or broader search term.</p>
						</div>
					{:else}
						{#each filteredApps as app}
							<article class:appCard--outdated={app.updateAvailable} class="appCard">
								<div class="appCard__top">
									<div>
										<h3>{app.name}</h3>
										<p>{sourceLabel(app)}</p>
									</div>
									<span class:statusBadge--outdated={app.updateAvailable} class="statusBadge">
										{statusLabel(app)}
									</span>
								</div>

								<div class="appCard__versions">
									<div>
										<span>Installed</span>
										<strong>{app.version || "Unknown"}</strong>
									</div>
									<div>
										<span>Latest</span>
										<strong>{app.latestVersion || "Pending / unavailable"}</strong>
									</div>
								</div>

								<div class="appCard__meta">
									{#if app.publisher}<span>{app.publisher}</span>{/if}
									{#if app.catalogId}<span>catalog</span>{/if}
									{#if app.updateSource}<span>{app.updateSource}</span>{/if}
								</div>

								{#if app.path}
									<div class="appCard__path" title={app.path}>{app.path}</div>
								{/if}

								<div class="appCard__actions">
									{#if app.updateCommand}
										<code>{app.updateCommand}</code>
									{/if}
									{#if app.updateUrl || app.website}
										<button class="appCard__link" onclick={() => openAppLink(app)}>
											Open source
										</button>
									{/if}
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</SimpleBar>
		</div>
	{/if}
</section>

<style lang="scss">
	.apps {
		flex: 1;
		min-width: 0;
		padding: 22px;
		display: grid;
		grid-template-rows: auto auto auto minmax(0, 1fr);
		gap: 16px;
		background:
			radial-gradient(circle at top right, rgba(73, 131, 224, 0.22), transparent 28%),
			radial-gradient(circle at left bottom, rgba(50, 208, 158, 0.16), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
	}

	.apps__hero,
	.apps__toolbar,
	.apps__results,
	.statCard,
	.apps__message {
		border-radius: 22px;
	}

	.apps__hero {
		padding: 24px;
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 24px;
	}

	.apps__eyebrow {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.apps__hero h1 {
		font-size: 30px;
		line-height: 1.05;
		max-width: 660px;
		margin-bottom: 10px;
	}

	.apps__hero p {
		max-width: 700px;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.apps__heroActions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
		min-width: 180px;
	}

	.apps__primaryBtn,
	.appCard__link,
	.chip {
		border: 0;
	}

	.apps__primaryBtn {
		padding: 12px 18px;
		border-radius: 14px;
		background: linear-gradient(135deg, #78b4ff, #58d8c2);
		color: #07131f;
		font-weight: 700;
		box-shadow: 0 12px 30px rgba(88, 216, 194, 0.22);
	}

	.apps__timestamp {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.apps__stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}

	.statCard {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.statCard span {
		color: var(--text-secondary);
	}

	.statCard strong {
		font-size: 28px;
	}

	.statCard--warm {
		background: linear-gradient(180deg, rgba(255, 165, 0, 0.12), rgba(255, 255, 255, 0.08));
	}

	.apps__toolbar {
		padding: 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.apps__filters,
	.apps__controls {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.chip {
		padding: 10px 14px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-secondary);
	}

	.chip--active {
		background: rgba(120, 180, 255, 0.18);
		color: var(--text-primary);
	}

	.apps__search,
	.apps__sort {
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(8, 11, 20, 0.22);
		color: var(--text-primary);
		padding: 11px 13px;
		min-width: 220px;
	}

	.apps__results {
		padding: 14px;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.apps__resultsHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 6px 14px;
		color: var(--text-secondary);
	}

	.apps__resultsHeader strong {
		color: var(--text-primary);
		margin-right: 8px;
	}

	.apps__pending {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.apps__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
		padding: 6px;
	}

	.appCard {
		padding: 16px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-height: 210px;
	}

	.appCard--outdated {
		background: linear-gradient(180deg, rgba(255, 170, 0, 0.12), rgba(255, 255, 255, 0.05));
		border-color: rgba(255, 184, 77, 0.36);
	}

	.appCard__top,
	.appCard__versions,
	.appCard__actions {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}

	.appCard__top h3 {
		font-size: 18px;
		margin-bottom: 5px;
	}

	.appCard__top p,
	.appCard__versions span,
	.appCard__meta,
	.appCard__path {
		color: var(--text-secondary);
	}

	.appCard__versions {
		padding: 12px;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.14);
	}

	.appCard__versions div {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.appCard__versions strong {
		font-size: 16px;
	}

	.appCard__meta {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		font-size: 12px;
	}

	.appCard__meta span {
		padding: 4px 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
	}

	.appCard__path {
		font-size: 12px;
		line-height: 1.5;
		word-break: break-all;
	}

	.appCard__actions {
		margin-top: auto;
		align-items: center;
		flex-wrap: wrap;
	}

	.appCard__actions code {
		font-size: 11px;
		padding: 8px 10px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.22);
	}

	.appCard__link {
		padding: 9px 12px;
		border-radius: 10px;
		background: rgba(120, 180, 255, 0.18);
		color: var(--text-primary);
	}

	.statusBadge {
		height: fit-content;
		padding: 7px 10px;
		border-radius: 999px;
		font-size: 12px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-secondary);
	}

	.statusBadge--outdated {
		background: rgba(255, 184, 77, 0.18);
		color: #ffd38a;
	}

	.apps__message,
	.apps__empty {
		padding: 26px;
		text-align: center;
		color: var(--text-secondary);
	}

	.apps__message--error {
		border-color: rgba(255, 102, 102, 0.35);
		color: #ffc7c7;
	}

	.spin {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		border: 2px solid rgba(255, 255, 255, 0.25);
		border-top-color: rgba(255, 255, 255, 0.95);
		display: inline-block;
		animation: spin 1s linear infinite;
	}

	@media (max-width: 1100px) {
		.apps__stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.apps__hero,
		.apps__toolbar {
			flex-direction: column;
			align-items: flex-start;
		}

		.apps__heroActions {
			align-items: flex-start;
		}
	}

	@media (max-width: 720px) {
		.apps {
			padding: 14px;
		}

		.apps__stats {
			grid-template-columns: 1fr;
		}

		.apps__search,
		.apps__sort {
			min-width: 100%;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
