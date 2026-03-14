<script>
	import { createEventDispatcher } from "svelte";

	let {
		open = false,
		detail = null,
		loading = false,
		error = "",
		requestedName = "",
		currentVersion = null,
	} = $props();

	const dispatch = createEventDispatcher();
	let versionFilter = $state("");

	const filteredVersions = $derived.by(() => {
		const versions = detail?.versions ?? [];
		const filter = versionFilter.trim().toLowerCase();
		if (!filter) return versions;
		return versions.filter((entry) =>
			entry.version.toLowerCase().includes(filter),
		);
	});

	$effect(() => {
		const _ = requestedName;
		versionFilter = "";
	});

	function close() {
		dispatch("close");
	}

	function handleOverlayClick(event) {
		if (event.target === event.currentTarget) close();
	}

	function handleOverlayKeydown(event) {
		if (
			event.target === event.currentTarget &&
			(event.key === "Enter" || event.key === " ")
		) {
			event.preventDefault();
			close();
		}
	}

	function handleKeydown(event) {
		if (event.key === "Escape") close();
	}

	function formatValue(value, format) {
		if (value == null || value === "") return "N/A";
		if (format === "number") return new Intl.NumberFormat().format(Number(value));
		if (format === "bytes") return formatBytes(Number(value));
		if (format === "date") return formatDate(value);
		return value;
	}

	function formatDate(value) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(date);
	}

	function formatBytes(bytes) {
		if (!Number.isFinite(bytes) || bytes <= 0) return "N/A";
		const units = ["B", "KB", "MB", "GB"];
		let value = bytes;
		let unit = units[0];
		for (let i = 0; i < units.length; i++) {
			unit = units[i];
			if (value < 1024 || i === units.length - 1) break;
			value /= 1024;
		}
		return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
	}

	function iconForLink(type) {
		switch (type) {
			case "repository":
				return "repo";
			case "issues":
				return "issue";
			case "homepage":
				return "link";
			default:
				return "box";
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="modal"
		role="presentation"
		tabindex="-1"
		onclick={handleOverlayClick}
		onkeydown={handleOverlayKeydown}
	>
		<div class="modal__panel" role="dialog" aria-modal="true" aria-label={detail?.name || requestedName}>
			<button class="modal__close" onclick={close} aria-label="Close details">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>

			{#if loading}
				<div class="modal__state">
					<span class="spin"></span>
					<p>Loading package details for {requestedName}…</p>
				</div>
			{:else if error}
				<div class="modal__state modal__state--error">
					<p>{error}</p>
				</div>
			{:else if detail}
				<div class="modal__layout">
					<section class="hero">
						<div class="hero__titleRow">
							<div>
								<h2 class="hero__title">{detail.name}</h2>
								<div class="hero__versionRow">
									<span class="hero__version">v{detail.version}</span>
									{#if currentVersion}
										<span class="hero__current">Current: {currentVersion}</span>
									{/if}
								</div>
							</div>
							<div class="hero__actions">
								{#each detail.links ?? [] as link}
									<a class="action" href={link.url} target="_blank" rel="noreferrer">
										<span class="action__icon action__icon--{iconForLink(link.type)}">
											{#if iconForLink(link.type) === "repo"}
												<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
													<path d="M6.5 9.5 3.5 12.5" />
													<path d="M9.5 6.5 12.5 3.5" />
													<path d="M5 3.5h7.5V11" />
												</svg>
											{:else if iconForLink(link.type) === "issue"}
												<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
													<circle cx="8" cy="8" r="6.2" />
													<path d="M8 4.8v3.4" />
													<circle cx="8" cy="11.4" r=".7" fill="currentColor" stroke="none" />
												</svg>
											{:else if iconForLink(link.type) === "link"}
												<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
													<path d="M6.5 9.5 9.5 6.5" />
													<path d="M5.2 11a2.4 2.4 0 0 1 0-3.4l1.4-1.4a2.4 2.4 0 1 1 3.4 3.4L9.4 10" />
													<path d="M10.8 5a2.4 2.4 0 0 1 0 3.4l-1.4 1.4A2.4 2.4 0 0 1 6 6.4l.6-.6" />
												</svg>
											{:else}
												<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
													<path d="M2.5 5.5h11v5h-11z" />
													<path d="M5 5.5V4h6v1.5" />
												</svg>
											{/if}
										</span>
										<span>{link.label}</span>
									</a>
								{/each}
							</div>
						</div>

						{#if detail.badges?.length}
							<div class="hero__badges">
								{#each detail.badges as badge}
									<span class="badge">{badge}</span>
								{/each}
							</div>
						{/if}

						{#if detail.description}
							<p class="hero__description">{detail.description}</p>
						{/if}

						<div class="stats">
							{#each detail.stats ?? [] as stat}
								<div class="statCard">
									<span class="statCard__label">{stat.label}</span>
									<strong class="statCard__value">
										{formatValue(stat.value, stat.format)}
									</strong>
								</div>
							{/each}
						</div>

						<div class="install">
							<div class="install__header">
								<span>Get Started</span>
								<span class="install__tool">{detail.install?.label}</span>
							</div>
							<div class="install__body">
								{#each detail.install?.lines ?? [] as line}
									<div class="install__line">{line}</div>
								{/each}
							</div>
						</div>
					</section>

					<aside class="sidebar">
						{#if detail.downloads}
							<section class="sidebarCard">
								<div class="sidebarCard__eyebrow">{detail.downloads.label}</div>
								<div class="sidebarCard__value">
									{formatValue(detail.downloads.value, detail.downloads.format)}
								</div>
								{#if detail.downloads.start && detail.downloads.end}
									<div class="sidebarCard__meta">
										{detail.downloads.start} to {detail.downloads.end}
									</div>
								{:else if detail.downloads.total || detail.downloads.daily}
									<div class="sidebarCard__meta">
										{#if detail.downloads.daily}
											Daily {formatValue(detail.downloads.daily, "number")}
										{/if}
										{#if detail.downloads.total}
											· Total {formatValue(detail.downloads.total, "number")}
										{/if}
									</div>
								{/if}
							</section>
						{/if}

						{#if detail.compatibility?.length}
							<section class="sidebarCard">
								<div class="sidebarCard__eyebrow">Compatibility</div>
								<div class="compatibility">
									{#each detail.compatibility as item}
										<div class="compatibility__row">
											<span>{item.label}</span>
											<strong>{item.value}</strong>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						<section class="sidebarCard sidebarCard--versions">
							<div class="sidebarCard__eyebrow">Versions</div>
							<input
								class="versionFilter"
								type="text"
								placeholder="Filter versions"
								bind:value={versionFilter}
							/>
							<div class="versions">
								{#each filteredVersions as version}
									<div class:versionItem--latest={version.isLatest} class="versionItem">
										<div class="versionItem__main">
											<div class="versionItem__name">{version.version}</div>
											{#if version.labels?.length}
												<div class="versionItem__labels">
													{#each version.labels as label}
														<span class:versionLabel--latest={label === "latest"} class="versionLabel">{label}</span>
													{/each}
												</div>
											{/if}
										</div>
										<div class="versionItem__date">
											{version.date ? formatDate(version.date) : ""}
										</div>
									</div>
								{/each}
							</div>
						</section>
					</aside>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.modal {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: stretch;
		justify-content: center;
		padding: 28px;
		background:
			radial-gradient(circle at top right, rgba(255, 122, 0, 0.09), transparent 28%),
			radial-gradient(circle at top left, rgba(91, 156, 246, 0.14), transparent 30%),
			rgba(4, 5, 8, 0.82);
		backdrop-filter: blur(24px) saturate(160%);
		-webkit-backdrop-filter: blur(24px) saturate(160%);
	}

	.modal__panel {
		position: relative;
		width: min(1440px, 100%);
		max-height: 100%;
		overflow: auto;
		border-radius: 28px;
		border: 1px solid rgba(255, 255, 255, 0.09);
		background:
			linear-gradient(180deg, rgba(18, 18, 22, 0.98), rgba(9, 10, 14, 0.98));
		box-shadow:
			0 40px 100px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.modal__close {
		position: sticky;
		top: 16px;
		left: calc(100% - 56px);
		z-index: 5;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		margin: 16px 16px 0 auto;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.72);
		cursor: pointer;
		transition: all 0.18s ease;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
			color: rgba(255, 255, 255, 0.96);
		}

		svg {
			width: 16px;
			height: 16px;
		}
	}

	.modal__state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 420px;
		gap: 14px;
		color: rgba(255, 255, 255, 0.76);
	}

	.modal__state--error {
		color: rgba(255, 120, 120, 0.9);
	}

	.modal__layout {
		display: grid;
		grid-template-columns: minmax(0, 1.9fr) minmax(280px, 0.95fr);
		gap: 28px;
		padding: 6px 28px 30px;
	}

	.hero {
		padding: 10px 8px 8px 2px;
	}

	.hero__titleRow {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18px;
	}

	.hero__title {
		margin: 0;
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: clamp(34px, 4vw, 52px);
		line-height: 1;
		letter-spacing: -0.04em;
		color: rgba(255, 255, 255, 0.96);
	}

	.hero__versionRow {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
	}

	.hero__version {
		font-size: 20px;
		color: rgba(255, 255, 255, 0.7);
	}

	.hero__current {
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		font-size: 12px;
		color: rgba(255, 255, 255, 0.55);
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 10px;
	}

	.action {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.86);
		text-decoration: none;
		font-size: 14px;
		transition: all 0.18s ease;

		&:hover {
			transform: translateY(-1px);
			background: rgba(255, 255, 255, 0.07);
			border-color: rgba(255, 255, 255, 0.15);
		}
	}

	.action__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;

		svg {
			width: 16px;
			height: 16px;
		}
	}

	.hero__badges {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 22px;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 8px 14px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.82);
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: 13px;
	}

	.hero__description {
		max-width: 760px;
		margin: 28px 0 0;
		font-size: 18px;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.58);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin-top: 36px;
		padding-top: 24px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.statCard {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 18px 16px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.statCard__label {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.42);
	}

	.statCard__value {
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: 28px;
		line-height: 1.2;
		color: rgba(255, 255, 255, 0.94);
	}

	.install {
		margin-top: 28px;
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.025);
		overflow: hidden;
	}

	.install__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 22px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		color: rgba(255, 255, 255, 0.84);
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.install__tool {
		padding: 8px 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.035);
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: 13px;
		letter-spacing: 0;
		text-transform: none;
	}

	.install__body {
		padding: 22px;
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
	}

	.install__line {
		font-size: 17px;
		line-height: 1.95;
		color: rgba(255, 255, 255, 0.74);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sidebarCard {
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.03);
		padding: 18px;
	}

	.sidebarCard__eyebrow {
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.44);
	}

	.sidebarCard__value {
		margin-top: 14px;
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: 34px;
		line-height: 1.1;
		color: rgba(255, 255, 255, 0.96);
	}

	.sidebarCard__meta {
		margin-top: 10px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.48);
	}

	.compatibility {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.compatibility__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.72);

		&:last-child {
			border-bottom: 0;
			padding-bottom: 0;
		}

		strong {
			font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
			color: rgba(255, 255, 255, 0.92);
		}
	}

	.sidebarCard--versions {
		flex: 1;
		min-height: 420px;
	}

	.versionFilter {
		width: 100%;
		margin-top: 14px;
		padding: 13px 16px;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.86);
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: 14px;
		outline: none;

		&:focus {
			border-color: rgba(91, 156, 246, 0.45);
			box-shadow: 0 0 0 4px rgba(91, 156, 246, 0.12);
		}
	}

	.versions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 14px;
	}

	.versionItem {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 14px;
		border-radius: 18px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(255, 255, 255, 0.02);
	}

	.versionItem--latest {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(91, 156, 246, 0.28);
	}

	.versionItem__main {
		min-width: 0;
	}

	.versionItem__name {
		font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", monospace;
		font-size: 16px;
		color: rgba(255, 255, 255, 0.94);
		word-break: break-all;
	}

	.versionItem__labels {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.versionLabel {
		padding: 4px 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.6);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.versionLabel--latest {
		background: rgba(0, 194, 255, 0.14);
		color: rgba(93, 216, 255, 0.96);
	}

	.versionItem__date {
		flex-shrink: 0;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.45);
	}

	.spin {
		display: inline-block;
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.15);
		border-top-color: rgba(255, 255, 255, 0.8);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@media (max-width: 1180px) {
		.modal {
			padding: 16px;
		}

		.modal__layout {
			grid-template-columns: 1fr;
		}

		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.hero__titleRow {
			flex-direction: column;
		}

		.hero__actions {
			width: 100%;
			justify-content: flex-start;
		}

		.stats {
			grid-template-columns: 1fr;
		}

		.versionItem {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
