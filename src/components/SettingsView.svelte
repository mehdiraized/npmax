<script>
	import { onMount } from "svelte";
	import { shell } from "electron";

	const { ipcRenderer } = require("electron");
	const DONATE_URL = "https://buymeacoffee.com/farobox";

	let { open = false, onClose = () => {} } = $props();

	let activeTab = $state("general");
	let appInfo = $state({
		name: "npMax",
		version: "—",
		description: "",
		homepage: "",
		repositoryUrl: "",
		releasesUrl: "",
		issuesUrl: "",
		platform: "",
		electronVersion: "",
		nodeVersion: "",
	});

	const tabs = [
		{ id: "general", label: "General" },
		{ id: "about", label: "About" },
	];

	const appRows = $derived([
		{ label: "Version", value: appInfo.version || "—" },
		{ label: "Platform", value: appInfo.platform || "Unknown" },
		{ label: "Node.js", value: appInfo.nodeVersion || "Unknown" },
		{ label: "Electron", value: appInfo.electronVersion || "Unknown" },
	]);

	onMount(async () => {
		try {
			const result = await ipcRenderer.invoke("get-app-info");
			if (result) appInfo = result;
		} catch (err) {
			console.error("Unable to load app info:", err);
		}
	});

	function checkForUpdates() {
		ipcRenderer.send("check-for-updates");
	}

	function openExternal(url) {
		if (!url) return;
		void shell.openExternal(url);
	}

	function close() {
		onClose();
	}

	function handleOverlayClick(event) {
		if (event.target === event.currentTarget) close();
	}

	function handleKeydown(event) {
		if (open && event.key === "Escape") close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="settingsModal" role="presentation" onclick={handleOverlayClick}>
		<div class="settingsWindow" role="dialog" aria-modal="true" aria-label="Application settings">
			<header class="settingsTitlebar">
				<div class="settingsTraffic" aria-hidden="true">
					<span class="settingsTraffic__dot settingsTraffic__dot--red"></span>
					<span class="settingsTraffic__dot settingsTraffic__dot--amber"></span>
					<span class="settingsTraffic__dot settingsTraffic__dot--green"></span>
				</div>

				<div class="settingsTitle">Settings</div>

				<button class="settingsClose" onclick={close} aria-label="Close settings">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</header>

			<div class="settingsTabs" role="tablist" aria-label="Settings sections">
				{#each tabs as tab}
					<button
						class="settingsTab"
						class:settingsTab--active={activeTab === tab.id}
						role="tab"
						aria-selected={activeTab === tab.id}
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<div class="settingsBody">
				{#if activeTab === "general"}
					<section class="settingsSection">
						<div class="settingsSection__intro">
							<div class="appBadge">
								<div class="appBadge__icon">n</div>
								<div>
									<h2>{appInfo.name}</h2>
									<p>Core application preferences and maintenance actions.</p>
								</div>
							</div>
						</div>

						<div class="settingsGroup">
							<div class="settingsGroup__label">Software Update</div>
							<div class="settingsCard settingsCard--stack">
								<div class="settingsAction">
									<div>
										<strong>Check for Updates</strong>
										<p>Run a manual update check for the current app.</p>
									</div>
									<button class="primaryBtn" onclick={checkForUpdates}>Check Now</button>
								</div>
								<div class="settingsAction">
									<div>
										<strong>Release Notes</strong>
										<p>Open the latest shipped release details in your browser.</p>
									</div>
									<button class="secondaryBtn" onclick={() => openExternal(appInfo.releasesUrl)}>
										Open Releases
									</button>
								</div>
							</div>
						</div>

						<div class="settingsGroup">
							<div class="settingsGroup__label">Support</div>
							<div class="settingsCard settingsCard--stack">
								<div class="settingsAction">
									<div>
										<strong>Report an Issue</strong>
										<p>Open the issue tracker to report a bug or request a feature.</p>
									</div>
									<button class="secondaryBtn" onclick={() => openExternal(appInfo.issuesUrl)}>
										Open GitHub
									</button>
								</div>
								<div class="settingsAction">
									<div>
										<strong>Support Development</strong>
										<p>Help fund maintenance and future improvements.</p>
									</div>
									<button class="secondaryBtn" onclick={() => openExternal(DONATE_URL)}>
										Buy Me a Coffee
									</button>
								</div>
							</div>
						</div>
					</section>
				{:else}
					<section class="settingsSection">
						<div class="settingsSection__intro">
							<div class="appBadge">
								<div class="appBadge__icon">n</div>
								<div>
									<h2>{appInfo.name}</h2>
									<p>
										{appInfo.description ||
											"Dependency and installed app management in one focused desktop workspace."}
									</p>
								</div>
							</div>
						</div>

						<div class="settingsGroup">
							<div class="settingsGroup__label">App Info</div>
							<div class="settingsCard settingsCard--table">
								{#each appRows as row}
									<div class="infoRow">
										<span>{row.label}</span>
										<strong>{row.value}</strong>
									</div>
								{/each}
							</div>
						</div>

						<div class="settingsGroup">
							<div class="settingsGroup__label">Links</div>
							<div class="settingsCard settingsCard--stack">
								<div class="settingsAction">
									<div>
										<strong>Website</strong>
										<p>Visit the product page for updates and documentation.</p>
									</div>
									<button class="secondaryBtn" onclick={() => openExternal(appInfo.homepage)}>
										Open Website
									</button>
								</div>
								<div class="settingsAction">
									<div>
										<strong>Repository</strong>
										<p>Browse the project source and development history.</p>
									</div>
									<button class="secondaryBtn" onclick={() => openExternal(appInfo.repositoryUrl)}>
										Open GitHub
									</button>
								</div>
							</div>
						</div>
					</section>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.settingsModal {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 24px;
		background: rgba(5, 8, 13, 0.52);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.settingsWindow {
		width: min(800px, 100%);
		min-height: min(620px, calc(100vh - 48px));
		max-height: calc(100vh - 48px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 18px;
		background: rgba(14, 17, 24, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 28px 80px rgba(0, 0, 0, 0.44),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.settingsTitlebar {
		position: relative;
		height: 46px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 18px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(8, 10, 16, 0.92);
	}

	.settingsTraffic {
		position: absolute;
		left: 18px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.settingsTraffic__dot {
		width: 12px;
		height: 12px;
		border-radius: 999px;
	}

	.settingsTraffic__dot--red {
		background: #ff5f57;
	}

	.settingsTraffic__dot--amber {
		background: #febc2e;
	}

	.settingsTraffic__dot--green {
		background: #28c840;
	}

	.settingsTitle {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.34);
	}

	.settingsClose {
		position: absolute;
		right: 12px;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
		transition:
			background 160ms ease,
			color 160ms ease;

		svg {
			width: 15px;
			height: 15px;
		}

		&:hover {
			background: rgba(255, 255, 255, 0.06);
			color: rgba(255, 255, 255, 0.84);
		}
	}

	.settingsTabs {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(14, 17, 24, 0.98);
	}

	.settingsTab {
		position: relative;
		padding: 0 8px 12px;
		border: 0;
		background: transparent;
		color: rgba(255, 255, 255, 0.46);
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.01em;
		transition: color 160ms ease;

		&::after {
			content: "";
			position: absolute;
			left: 8px;
			right: 8px;
			bottom: 0;
			height: 2px;
			border-radius: 999px;
			background: transparent;
			transition: background 160ms ease;
		}

		&:hover {
			color: rgba(255, 255, 255, 0.8);
		}
	}

	.settingsTab--active {
		color: rgba(255, 255, 255, 0.96);

		&::after {
			background: #7d7aff;
		}
	}

	.settingsBody {
		flex: 1;
		overflow: auto;
		padding: 26px 28px 30px;
	}

	.settingsSection {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.settingsSection__intro {
		padding-bottom: 2px;
	}

	.appBadge {
		display: flex;
		align-items: center;
		gap: 16px;

		h2 {
			margin: 0 0 6px;
			font-size: 20px;
		}

		p {
			margin: 0;
			color: rgba(255, 255, 255, 0.58);
			line-height: 1.6;
			max-width: 520px;
		}
	}

	.appBadge__icon {
		width: 68px;
		height: 68px;
		display: grid;
		place-items: center;
		border-radius: 14px;
		background:
			linear-gradient(135deg, rgba(116, 138, 255, 0.16), rgba(92, 219, 194, 0.08)),
			rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.92);
		font-size: 30px;
		font-weight: 800;
		text-transform: lowercase;
	}

	.settingsGroup {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.settingsGroup__label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.34);
	}

	.settingsCard {
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		overflow: hidden;
	}

	.settingsCard--stack {
		display: flex;
		flex-direction: column;
	}

	.settingsAction {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 18px;
		padding: 18px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);

		&:last-child {
			border-bottom: 0;
		}

		strong {
			display: block;
			margin-bottom: 5px;
			font-size: 15px;
		}

		p {
			margin: 0;
			color: rgba(255, 255, 255, 0.54);
			line-height: 1.55;
		}
	}

	.settingsCard--table {
		display: flex;
		flex-direction: column;
	}

	.infoRow {
		display: grid;
		grid-template-columns: 140px minmax(0, 1fr);
		gap: 16px;
		padding: 15px 18px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);

		&:last-child {
			border-bottom: 0;
		}

		span {
			color: rgba(255, 255, 255, 0.42);
		}

		strong {
			font-weight: 600;
			color: rgba(255, 255, 255, 0.9);
		}
	}

	.primaryBtn,
	.secondaryBtn {
		height: 36px;
		padding: 0 14px;
		border-radius: 10px;
		font-weight: 700;
		transition:
			transform 160ms ease,
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease;

		&:hover {
			transform: translateY(-1px);
		}
	}

	.primaryBtn {
		border: 0;
		background: linear-gradient(135deg, #79b5ff, #5ed8c8);
		color: #07131f;
	}

	.secondaryBtn {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.88);
	}

	@media (max-width: 760px) {
		.settingsModal {
			padding: 12px;
		}

		.settingsWindow {
			min-height: calc(100vh - 24px);
			max-height: calc(100vh - 24px);
			border-radius: 16px;
		}

		.settingsBody {
			padding: 20px;
		}

		.settingsAction {
			grid-template-columns: 1fr;
		}

		.infoRow {
			grid-template-columns: 1fr;
			gap: 6px;
		}

		.appBadge {
			align-items: flex-start;
		}
	}
</style>
