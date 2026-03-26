<script>
	import { onMount } from "svelte";
	import { shell } from "electron";

	const { ipcRenderer } = require("electron");
	const DONATE_URL = "https://buymeacoffee.com/farobox";

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

	const themeOptions = [
		{
			name: "Midnight Glass",
			description: "تم فعلی اپ با کنتراست بالا و سطح‌های شیشه‌ای.",
			active: true,
		},
		{
			name: "Soft Light",
			description: "نسخه روشن با پس‌زمینه روشن و سطح‌های نرم. به‌زودی فعال می‌شود.",
			active: false,
		},
		{
			name: "Paper Day",
			description: "تم روشن مینیمال برای محیط‌های کاری طولانی. به‌زودی فعال می‌شود.",
			active: false,
		},
	];

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
</script>

<section class="settings">
	<div class="settings__hero">
		<div>
			<div class="settings__eyebrow">Settings</div>
			<h1>App preferences and product info</h1>
			<p>
				در این بخش می‌توانیم اطلاعات اپ، وضعیت تم‌ها، و امکانات آینده برای
				انتقال پروژه‌ها را یک‌جا ببینیم.
			</p>
		</div>
		<button class="settings__primary" onclick={checkForUpdates}>
			Check for updates
		</button>
	</div>

	<div class="settings__grid">
		<section class="card card--general">
			<div class="card__head">
				<div>
					<span class="card__kicker">General</span>
					<h2>General information</h2>
				</div>
				<span class="card__pill">v{appInfo.version}</span>
			</div>

			<div class="infoList">
				<div class="infoRow">
					<span>Application</span>
					<strong>{appInfo.name}</strong>
				</div>
				<div class="infoRow">
					<span>Current version</span>
					<strong>{appInfo.version}</strong>
				</div>
				<div class="infoRow">
					<span>Platform</span>
					<strong>{appInfo.platform || "Unknown"}</strong>
				</div>
				<div class="infoRow">
					<span>Electron</span>
					<strong>{appInfo.electronVersion || "Unknown"}</strong>
				</div>
				<div class="infoRow">
					<span>Node.js</span>
					<strong>{appInfo.nodeVersion || "Unknown"}</strong>
				</div>
				<div class="infoRow">
					<span>npMax Pro</span>
					<strong>Coming soon</strong>
				</div>
			</div>

			<div class="card__actions">
				<button class="ghostBtn" onclick={checkForUpdates}>Check for new version</button>
				{#if appInfo.releasesUrl}
					<button
						class="ghostBtn"
						onclick={() => openExternal(appInfo.releasesUrl)}
					>
						Open releases
					</button>
				{/if}
				<button class="ghostBtn" onclick={() => openExternal(DONATE_URL)}>
					Donate for Pro
				</button>
			</div>
		</section>

		<section class="card">
			<div class="card__head">
				<div>
					<span class="card__kicker">About</span>
					<h2>About this app</h2>
				</div>
			</div>

			<p class="card__body">
				{appInfo.description ||
					"npMax helps you inspect dependency versions and track installed application updates from one desktop workspace."}
			</p>

			<div class="linkGrid">
				<button class="linkCard" onclick={() => openExternal(appInfo.repositoryUrl)}>
					<span>Repository</span>
					<strong>View source on GitHub</strong>
				</button>
				<button class="linkCard" onclick={() => openExternal(appInfo.homepage)}>
					<span>Website</span>
					<strong>Open product page</strong>
				</button>
				<button class="linkCard" onclick={() => openExternal(appInfo.issuesUrl)}>
					<span>Support</span>
					<strong>Report an issue</strong>
				</button>
				<button class="linkCard" onclick={() => openExternal(DONATE_URL)}>
					<span>Support npMax Pro</span>
					<strong>Donate via Buy Me a Coffee</strong>
				</button>
			</div>
		</section>

		<section class="card">
			<div class="card__head">
				<div>
					<span class="card__kicker">Theme</span>
					<h2>Theme presets</h2>
				</div>
				<span class="card__status">Light themes disabled for now</span>
			</div>

			<div class="themeList">
				{#each themeOptions as option}
					<div class:themeOption--disabled={!option.active} class="themeOption">
						<div class="themeOption__meta">
							<strong>{option.name}</strong>
							<span>{option.description}</span>
						</div>
						<button disabled={!option.active} class:themeOption__btn--active={option.active} class="themeOption__btn">
							{option.active ? "Active" : "Soon"}
						</button>
					</div>
				{/each}
			</div>
		</section>

		<section class="card">
			<div class="card__head">
				<div>
					<span class="card__kicker">Projects</span>
					<h2>Import / Export</h2>
				</div>
			</div>

			<div class="placeholder">
				<div class="placeholder__icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M12 3v12" />
						<path d="m7 10 5 5 5-5" />
						<path d="M5 21h14" />
					</svg>
				</div>
				<div class="placeholder__copy">
					<strong>Project import/export is coming soon</strong>
					<p>
						به‌زودی امکان گرفتن خروجی از لیست پروژه‌ها و ایمپورت کردن آن‌ها در
						این بخش اضافه می‌شود.
					</p>
				</div>
			</div>
		</section>
	</div>
</section>

<style lang="scss">
	.settings {
		min-height: 100vh;
		padding: 30px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.settings__hero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18px;
		padding: 26px 28px;
		border-radius: 28px;
		background:
			radial-gradient(circle at top right, rgba(120, 180, 255, 0.22), transparent 30%),
			radial-gradient(circle at left bottom, rgba(88, 216, 194, 0.16), transparent 26%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);

		h1 {
			margin: 0;
			font-size: clamp(28px, 4vw, 40px);
			line-height: 1;
		}

		p {
			max-width: 720px;
			margin: 14px 0 0;
			color: var(--text-secondary);
			line-height: 1.7;
		}
	}

	.settings__eyebrow {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 12px;
	}

	.settings__primary,
	.ghostBtn,
	.linkCard,
	.themeOption__btn {
		border: 0;
		cursor: pointer;
		transition:
			transform 160ms ease,
			opacity 160ms ease,
			background 160ms ease,
			border-color 160ms ease;

		&:hover:enabled {
			transform: translateY(-1px);
		}
	}

	.settings__primary {
		padding: 13px 18px;
		border-radius: 16px;
		background: linear-gradient(135deg, #78b4ff, #58d8c2);
		color: #07131f;
		font-weight: 700;
		white-space: nowrap;
	}

	.settings__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.card {
		padding: 22px;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.card--general {
		grid-column: span 2;
	}

	.card__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;

		h2 {
			margin: 6px 0 0;
			font-size: 20px;
		}
	}

	.card__kicker {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.card__pill,
	.card__status {
		padding: 8px 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--text-secondary);
		font-size: 12px;
	}

	.card__body {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.7;
	}

	.infoList {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.infoRow {
		padding: 16px 18px;
		border-radius: 18px;
		background: rgba(0, 0, 0, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		flex-direction: column;
		gap: 8px;

		span {
			font-size: 12px;
			color: var(--text-muted);
		}

		strong {
			font-size: 18px;
			font-weight: 700;
		}
	}

	.card__actions,
	.linkGrid {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.ghostBtn {
		padding: 11px 14px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--text-primary);
		font-weight: 600;
	}

	.linkGrid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.linkCard {
		padding: 16px;
		border-radius: 18px;
		text-align: left;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 6px;

		span {
			font-size: 12px;
			color: var(--text-muted);
		}

		strong {
			font-size: 15px;
		}
	}

	.themeList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.themeOption {
		padding: 16px 18px;
		border-radius: 18px;
		background: rgba(0, 0, 0, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.themeOption--disabled {
		opacity: 0.72;
	}

	.themeOption__meta {
		display: flex;
		flex-direction: column;
		gap: 6px;

		span {
			color: var(--text-secondary);
			line-height: 1.6;
		}
	}

	.themeOption__btn {
		padding: 10px 14px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-secondary);
		font-weight: 700;
		min-width: 76px;
	}

	.themeOption__btn--active {
		background: linear-gradient(135deg, rgba(120, 180, 255, 0.24), rgba(88, 216, 194, 0.2));
		color: var(--text-primary);
	}

	.placeholder {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 18px;
		border-radius: 20px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
		border: 1px dashed rgba(255, 255, 255, 0.12);
	}

	.placeholder__icon {
		width: 46px;
		height: 46px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.07);
		color: #78b4ff;

		svg {
			width: 22px;
			height: 22px;
		}
	}

	.placeholder__copy {
		strong {
			display: block;
			margin-bottom: 6px;
		}

		p {
			margin: 0;
			color: var(--text-secondary);
			line-height: 1.7;
		}
	}

	@media (max-width: 1080px) {
		.settings__grid {
			grid-template-columns: 1fr;
		}

		.card--general {
			grid-column: span 1;
		}

		.linkGrid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 760px) {
		.settings {
			padding: 20px;
		}

		.settings__hero {
			flex-direction: column;
		}

		.infoList {
			grid-template-columns: 1fr;
		}

		.themeOption,
		.placeholder {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
