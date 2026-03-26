<script>
	import { onMount } from "svelte";
	import { shell } from "electron";

	const { ipcRenderer } = require("electron");
	const DONATE_URL = "https://buymeacoffee.com/farobox";

	let { open = false, onClose = () => {} } = $props();

	let activeTab = $state("overview");
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
		{
			id: "overview",
			label: "Overview",
			kicker: "Workspace",
			title: "A polished control center for your desktop toolkit.",
			description:
				"Keep app health, release access, and update actions in one focused place without leaving your current workflow.",
		},
		{
			id: "appearance",
			label: "Appearance",
			kicker: "Visuals",
			title: "Theme direction and visual mood.",
			description:
				"Preview the active glass direction for npMax and see the next visual presets planned for future versions.",
		},
		{
			id: "about",
			label: "About",
			kicker: "Product",
			title: "Links, support, and release channels.",
			description:
				"Jump to the repository, documentation, issue tracker, and support pages directly from the app shell.",
		},
		{
			id: "labs",
			label: "Labs",
			kicker: "Next",
			title: "Upcoming workflow ideas.",
			description:
				"Track the import/export roadmap and the premium enhancements planned for larger project teams.",
		},
	];

	const themeOptions = [
		{
			name: "Midnight Glass",
			description:
				"The current production look with high contrast, deep surfaces, and soft light accents.",
			status: "Active",
			active: true,
		},
		{
			name: "Soft Light",
			description:
				"A brighter studio mode with lighter panels and softer edges for daytime work sessions.",
			status: "Planned",
			active: false,
		},
		{
			name: "Paper Day",
			description:
				"A minimal editorial theme designed for long reading and dependency review sessions.",
			status: "Planned",
			active: false,
		},
	];

	const quickStats = $derived([
		{
			label: "Application",
			value: appInfo.name,
			highlight: "brand",
		},
		{
			label: "Version",
			value: appInfo.version,
			highlight: "neutral",
		},
		{
			label: "Platform",
			value: appInfo.platform || "Unknown",
			highlight: "neutral",
		},
		{
			label: "Runtime",
			value: appInfo.electronVersion
				? `Electron ${appInfo.electronVersion}`
				: "Unknown",
			highlight: "neutral",
		},
	]);

	onMount(async () => {
		try {
			const result = await ipcRenderer.invoke("get-app-info");
			if (result) {
				appInfo = result;
			}
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
		if (open && event.key === "Escape") {
			close();
		}
	}

	const currentTab = $derived(
		tabs.find((tab) => tab.id === activeTab) || tabs[0],
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="settingsModal" role="presentation" onclick={handleOverlayClick}>
		<div class="settingsModal__shell" role="dialog" aria-modal="true" aria-label="Application settings">
			<button class="settingsModal__close" onclick={close} aria-label="Close settings">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>

			<div class="settingsModal__sidebar">
				<div class="settingsModal__brand">
					<div class="settingsModal__eyebrow">Settings</div>
					<h2>npMax Control Room</h2>
					<p>Fine-tune app-level preferences and keep key product shortcuts within reach.</p>
				</div>

				<div class="settingsTabs" role="tablist" aria-label="Settings sections">
					{#each tabs as tab}
						<button
							class="settingsTab"
							class:settingsTab--active={activeTab === tab.id}
							role="tab"
							aria-selected={activeTab === tab.id}
							onclick={() => (activeTab = tab.id)}
						>
							<span>{tab.label}</span>
							<small>{tab.kicker}</small>
						</button>
					{/each}
				</div>

				<div class="settingsModal__support">
					<span>Support npMax</span>
					<strong>Help fund updates and future pro features.</strong>
					<button class="settingsModal__supportBtn" onclick={() => openExternal(DONATE_URL)}>
						Buy Me a Coffee
					</button>
				</div>
			</div>

			<div class="settingsModal__content">
				<section class="settingsHero">
					<div>
						<div class="settingsHero__kicker">{currentTab.kicker}</div>
						<h1>{currentTab.title}</h1>
						<p>{currentTab.description}</p>
					</div>
					<div class="settingsHero__actions">
						<button class="primaryBtn" onclick={checkForUpdates}>Check for updates</button>
						<button class="secondaryBtn" onclick={() => openExternal(appInfo.releasesUrl)}>
							Open releases
						</button>
					</div>
				</section>

				{#if activeTab === "overview"}
					<section class="panelGrid">
						<section class="panel panel--wide">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">System status</span>
									<h3>Current app environment</h3>
								</div>
								<span class="panel__badge">v{appInfo.version}</span>
							</div>

							<div class="statsGrid">
								{#each quickStats as stat}
									<div class={`statCard statCard--${stat.highlight}`}>
										<span>{stat.label}</span>
										<strong>{stat.value}</strong>
									</div>
								{/each}
							</div>

							<div class="detailsGrid">
								<div class="detailRow">
									<span>Node.js</span>
									<strong>{appInfo.nodeVersion || "Unknown"}</strong>
								</div>
								<div class="detailRow">
									<span>Electron</span>
									<strong>{appInfo.electronVersion || "Unknown"}</strong>
								</div>
								<div class="detailRow">
									<span>Platform</span>
									<strong>{appInfo.platform || "Unknown"}</strong>
								</div>
								<div class="detailRow">
									<span>Pro tier</span>
									<strong>Coming soon</strong>
								</div>
							</div>
						</section>

						<section class="panel">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">Quick actions</span>
									<h3>Maintenance</h3>
								</div>
							</div>

							<div class="actionStack">
								<button class="actionCard" onclick={checkForUpdates}>
									<span>Updater</span>
									<strong>Run a fresh version check</strong>
								</button>
								<button class="actionCard" onclick={() => openExternal(appInfo.releasesUrl)}>
									<span>Release notes</span>
									<strong>See the latest shipped changes</strong>
								</button>
								<button class="actionCard" onclick={() => openExternal(DONATE_URL)}>
									<span>Support</span>
									<strong>Back future pro features</strong>
								</button>
							</div>
						</section>
					</section>
				{/if}

				{#if activeTab === "appearance"}
					<section class="panelGrid">
						<section class="panel panel--wide">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">Theme presets</span>
									<h3>Visual directions</h3>
								</div>
								<span class="panel__badge">Project-aligned</span>
							</div>

							<div class="themeList">
								{#each themeOptions as option}
									<div class:themeOption--inactive={!option.active} class="themeOption">
										<div class="themeSwatch">
											<div class={`themeSwatch__orb ${option.active ? "themeSwatch__orb--active" : ""}`}></div>
										</div>
										<div class="themeOption__copy">
											<strong>{option.name}</strong>
											<p>{option.description}</p>
										</div>
										<span class:themeOption__status--active={option.active} class="themeOption__status">
											{option.status}
										</span>
									</div>
								{/each}
							</div>
						</section>

						<section class="panel">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">Design notes</span>
									<h3>Current direction</h3>
								</div>
							</div>

							<div class="noteStack">
								<div class="noteCard">
									<span>Glass surfaces</span>
									<strong>Layered depth with soft contrast</strong>
								</div>
								<div class="noteCard">
									<span>Accent language</span>
									<strong>Blue-cyan highlights with dark framing</strong>
								</div>
								<div class="noteCard">
									<span>Priority</span>
									<strong>Keep settings visually rich but distraction-free</strong>
								</div>
							</div>
						</section>
					</section>
				{/if}

				{#if activeTab === "about"}
					<section class="panelGrid">
						<section class="panel panel--wide">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">About npMax</span>
									<h3>Product summary</h3>
								</div>
							</div>

							<p class="panel__body">
								{appInfo.description ||
									"npMax helps you inspect dependency versions and track installed application updates from one streamlined desktop workspace."}
							</p>

							<div class="linkGrid">
								<button class="linkCard" onclick={() => openExternal(appInfo.repositoryUrl)}>
									<span>Repository</span>
									<strong>View source on GitHub</strong>
								</button>
								<button class="linkCard" onclick={() => openExternal(appInfo.homepage)}>
									<span>Website</span>
									<strong>Open the product page</strong>
								</button>
								<button class="linkCard" onclick={() => openExternal(appInfo.issuesUrl)}>
									<span>Support</span>
									<strong>Report a bug or request a feature</strong>
								</button>
								<button class="linkCard" onclick={() => openExternal(DONATE_URL)}>
									<span>Community</span>
									<strong>Support development directly</strong>
								</button>
							</div>
						</section>

						<section class="panel">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">Build info</span>
									<h3>Runtime details</h3>
								</div>
							</div>

							<div class="detailsColumn">
								<div class="detailRow">
									<span>App name</span>
									<strong>{appInfo.name}</strong>
								</div>
								<div class="detailRow">
									<span>Version</span>
									<strong>{appInfo.version}</strong>
								</div>
								<div class="detailRow">
									<span>Node.js</span>
									<strong>{appInfo.nodeVersion || "Unknown"}</strong>
								</div>
								<div class="detailRow">
									<span>Electron</span>
									<strong>{appInfo.electronVersion || "Unknown"}</strong>
								</div>
							</div>
						</section>
					</section>
				{/if}

				{#if activeTab === "labs"}
					<section class="panelGrid">
						<section class="panel panel--wide">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">Roadmap</span>
									<h3>Upcoming settings-connected workflows</h3>
								</div>
							</div>

							<div class="roadmapList">
								<div class="roadmapItem">
									<span class="roadmapItem__dot"></span>
									<div>
										<strong>Project import and export</strong>
										<p>Portable project lists for moving desktop setups between machines.</p>
									</div>
								</div>
								<div class="roadmapItem">
									<span class="roadmapItem__dot"></span>
									<div>
										<strong>Pro workspace features</strong>
										<p>Advanced tooling for larger dependency audits and premium workflows.</p>
									</div>
								</div>
								<div class="roadmapItem">
									<span class="roadmapItem__dot"></span>
									<div>
										<strong>Expanded appearance controls</strong>
										<p>Additional presets and deeper personalization hooks for the app shell.</p>
									</div>
								</div>
							</div>
						</section>

						<section class="panel">
							<div class="panel__head">
								<div>
									<span class="panel__kicker">Status</span>
									<h3>What is next</h3>
								</div>
							</div>

							<div class="noteStack">
								<div class="noteCard">
									<span>Import / Export</span>
									<strong>Planned</strong>
								</div>
								<div class="noteCard">
									<span>Additional themes</span>
									<strong>Planned</strong>
								</div>
								<div class="noteCard">
									<span>npMax Pro</span>
									<strong>In discovery</strong>
								</div>
							</div>
						</section>
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
		padding: 28px;
		background:
			radial-gradient(circle at top, rgba(96, 174, 255, 0.14), transparent 30%),
			rgba(4, 8, 14, 0.56);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
	}

	.settingsModal__shell {
		position: relative;
		width: min(1220px, 100%);
		height: min(820px, calc(100vh - 56px));
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr);
		border-radius: 30px;
		overflow: hidden;
		background:
			linear-gradient(180deg, rgba(13, 18, 28, 0.96), rgba(10, 13, 22, 0.98));
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 32px 90px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.settingsModal__close {
		position: absolute;
		top: 20px;
		right: 20px;
		z-index: 3;
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-primary);
		transition:
			transform 160ms ease,
			background 160ms ease,
			border-color 160ms ease;

		svg {
			width: 18px;
			height: 18px;
		}

		&:hover {
			transform: translateY(-1px);
			background: rgba(255, 255, 255, 0.1);
			border-color: rgba(255, 255, 255, 0.18);
		}
	}

	.settingsModal__sidebar {
		padding: 30px 22px 24px;
		display: flex;
		flex-direction: column;
		gap: 22px;
		background:
			radial-gradient(circle at top left, rgba(121, 181, 255, 0.18), transparent 32%),
			radial-gradient(circle at bottom left, rgba(88, 216, 194, 0.14), transparent 30%),
			rgba(255, 255, 255, 0.04);
		border-right: 1px solid rgba(255, 255, 255, 0.07);
	}

	.settingsModal__brand h2 {
		font-size: 28px;
		line-height: 1.02;
		margin-bottom: 10px;
	}

	.settingsModal__brand p {
		color: var(--text-secondary);
		line-height: 1.7;
	}

	.settingsModal__eyebrow,
	.settingsHero__kicker,
	.panel__kicker {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.settingsTabs {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.settingsTab {
		width: 100%;
		padding: 14px 16px;
		border-radius: 18px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 6px;
		transition:
			transform 160ms ease,
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease;

		span {
			font-size: 14px;
			font-weight: 700;
			color: inherit;
		}

		small {
			font-size: 11px;
			color: var(--text-muted);
		}

		&:hover {
			transform: translateX(2px);
			background: rgba(255, 255, 255, 0.05);
			color: var(--text-primary);
		}
	}

	.settingsTab--active {
		background: linear-gradient(135deg, rgba(120, 180, 255, 0.18), rgba(88, 216, 194, 0.12));
		border-color: rgba(120, 180, 255, 0.24);
		color: var(--text-primary);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.settingsModal__support {
		margin-top: auto;
		padding: 18px;
		border-radius: 22px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 8px;

		span {
			font-size: 11px;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--text-muted);
		}

		strong {
			font-size: 15px;
			line-height: 1.5;
		}
	}

	.settingsModal__supportBtn,
	.primaryBtn,
	.secondaryBtn,
	.actionCard,
	.linkCard {
		border: 0;
		cursor: pointer;
	}

	.settingsModal__supportBtn,
	.primaryBtn,
	.secondaryBtn {
		padding: 12px 16px;
		border-radius: 14px;
		font-weight: 700;
		transition:
			transform 160ms ease,
			background 160ms ease,
			border-color 160ms ease;

		&:hover {
			transform: translateY(-1px);
		}
	}

	.settingsModal__supportBtn,
	.primaryBtn {
		background: linear-gradient(135deg, #78b4ff, #58d8c2);
		color: #07131f;
	}

	.secondaryBtn {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.settingsModal__content {
		padding: 28px;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.settingsHero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 22px;
		padding: 24px;
		border-radius: 26px;
		background:
			radial-gradient(circle at right top, rgba(120, 180, 255, 0.2), transparent 26%),
			radial-gradient(circle at left bottom, rgba(88, 216, 194, 0.14), transparent 28%),
			rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);

		h1 {
			margin: 10px 0 0;
			font-size: clamp(28px, 3vw, 42px);
			line-height: 1.02;
			max-width: 720px;
		}

		p {
			margin: 14px 0 0;
			max-width: 700px;
			color: var(--text-secondary);
			line-height: 1.7;
		}
	}

	.settingsHero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.panelGrid {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
		gap: 18px;
	}

	.panel {
		padding: 22px;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 18px 38px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.panel--wide {
		min-width: 0;
	}

	.panel__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;

		h3 {
			margin-top: 8px;
			font-size: 20px;
		}
	}

	.panel__badge {
		padding: 9px 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.09);
		color: var(--text-secondary);
		font-size: 12px;
		white-space: nowrap;
	}

	.panel__body {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.8;
	}

	.statsGrid,
	.detailsGrid,
	.linkGrid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.statCard,
	.detailRow,
	.noteCard,
	.actionCard,
	.linkCard,
	.themeOption,
	.roadmapItem {
		border-radius: 18px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(0, 0, 0, 0.16);
	}

	.statCard {
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;

		span {
			font-size: 12px;
			color: var(--text-muted);
		}

		strong {
			font-size: 19px;
		}
	}

	.statCard--brand {
		background: linear-gradient(135deg, rgba(120, 180, 255, 0.2), rgba(88, 216, 194, 0.15));
	}

	.detailRow {
		padding: 15px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;

		span {
			color: var(--text-secondary);
		}

		strong {
			color: var(--text-primary);
		}
	}

	.detailsColumn,
	.actionStack,
	.noteStack,
	.roadmapList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.actionCard,
	.linkCard {
		padding: 16px;
		text-align: left;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 6px;
		transition:
			transform 160ms ease,
			background 160ms ease,
			border-color 160ms ease;

		span {
			font-size: 12px;
			color: var(--text-muted);
		}

		strong {
			font-size: 15px;
			line-height: 1.5;
		}

		&:hover {
			transform: translateY(-1px);
			background: rgba(255, 255, 255, 0.06);
			border-color: rgba(255, 255, 255, 0.12);
		}
	}

	.themeList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.themeOption {
		padding: 16px;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 16px;
	}

	.themeOption--inactive {
		opacity: 0.76;
	}

	.themeSwatch {
		width: 52px;
		height: 52px;
		display: grid;
		place-items: center;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.themeSwatch__orb {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08));
		box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.04);
	}

	.themeSwatch__orb--active {
		background: linear-gradient(135deg, #78b4ff, #58d8c2);
		box-shadow:
			0 0 0 8px rgba(120, 180, 255, 0.1),
			0 0 22px rgba(88, 216, 194, 0.22);
	}

	.themeOption__copy p {
		margin-top: 8px;
		color: var(--text-secondary);
		line-height: 1.7;
	}

	.themeOption__status {
		padding: 10px 13px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 700;
	}

	.themeOption__status--active {
		background: rgba(120, 180, 255, 0.16);
		color: #cce3ff;
	}

	.noteCard {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 7px;

		span {
			font-size: 12px;
			color: var(--text-muted);
		}

		strong {
			line-height: 1.5;
		}
	}

	.roadmapItem {
		padding: 18px;
		display: flex;
		align-items: flex-start;
		gap: 14px;

		p {
			margin-top: 8px;
			color: var(--text-secondary);
			line-height: 1.7;
		}
	}

	.roadmapItem__dot {
		width: 10px;
		height: 10px;
		margin-top: 7px;
		border-radius: 999px;
		flex-shrink: 0;
		background: linear-gradient(135deg, #78b4ff, #58d8c2);
		box-shadow: 0 0 18px rgba(88, 216, 194, 0.32);
	}

	@media (max-width: 1080px) {
		.settingsModal__shell {
			grid-template-columns: 1fr;
			height: min(880px, calc(100vh - 40px));
		}

		.settingsModal__sidebar {
			border-right: 0;
			border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		}

		.settingsTabs {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.panelGrid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 760px) {
		.settingsModal {
			padding: 12px;
		}

		.settingsModal__shell {
			height: calc(100vh - 24px);
			border-radius: 24px;
		}

		.settingsModal__content,
		.settingsModal__sidebar {
			padding: 20px;
		}

		.settingsTabs,
		.statsGrid,
		.detailsGrid,
		.linkGrid {
			grid-template-columns: 1fr;
		}

		.settingsHero {
			flex-direction: column;
			padding-right: 70px;
		}

		.settingsHero__actions {
			width: 100%;
		}

		.primaryBtn,
		.secondaryBtn {
			width: 100%;
		}

		.themeOption {
			grid-template-columns: 1fr;
			align-items: flex-start;
		}
	}
</style>
