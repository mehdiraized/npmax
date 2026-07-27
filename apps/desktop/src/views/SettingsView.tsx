import { useEffect, useState } from "react";
import { getAppInfo, openUrl } from "../lib/host";

const DONATE_URL = "https://buymeacoffee.com/farobox";
const APP_ICON = "/app-icon.png";

type AppInfo = {
	name: string;
	version: string;
	description: string;
	copyright: string;
	license: string;
	homepage: string;
	repositoryUrl: string;
	releasesUrl: string;
	issuesUrl: string;
	platform: string;
	arch?: string;
};

export function SettingsView({
	open,
	onClose,
	onCheckUpdates,
}: {
	open: boolean;
	onClose: () => void;
	onCheckUpdates?: () => void;
}) {
	const [activeTab, setActiveTab] = useState<"general" | "about">("general");
	const [appInfo, setAppInfo] = useState<AppInfo>({
		name: "npMax",
		version: "3.0.0",
		description: "Cross-platform dependency and installed app update manager",
		copyright: "© Mehdir — Mehdi Rezaei",
		license: "MIT",
		homepage: "https://github.com/mehdiraized/npmax",
		repositoryUrl: "https://github.com/mehdiraized/npmax",
		releasesUrl: "https://github.com/mehdiraized/npmax/releases",
		issuesUrl: "https://github.com/mehdiraized/npmax/issues",
		platform: navigator.platform,
	});

	useEffect(() => {
		if (!open) return;
		void getAppInfo()
			.then((info) =>
				setAppInfo((prev) => ({
					...prev,
					name: info.name || prev.name,
					version: info.version || prev.version,
					description: info.description || prev.description,
					copyright: info.copyright || prev.copyright,
					license: info.license || prev.license,
					homepage: info.homepage || prev.homepage,
					repositoryUrl: info.repositoryUrl || prev.repositoryUrl,
					releasesUrl: info.releasesUrl || prev.releasesUrl,
					issuesUrl: info.issuesUrl || prev.issuesUrl,
					platform: info.platform || prev.platform,
					arch: info.arch || prev.arch,
				})),
			)
			.catch(() => undefined);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	const platformLabel = [appInfo.platform, appInfo.arch].filter(Boolean).join(" · ");

	const appRows = [
		{ label: "Version", value: appInfo.version },
		{ label: "Platform", value: platformLabel || "Unknown" },
		{ label: "License", value: appInfo.license },
		{ label: "Copyright", value: appInfo.copyright },
	];

	return (
		<div
			className="settingsModal"
			role="presentation"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="settingsWindow"
				role="dialog"
				aria-modal="true"
				aria-label="Application settings"
			>
				<header className="settingsTitlebar">
					<div />
					<div className="settingsTitle">Settings</div>
					<button
						type="button"
						className="settingsClose"
						onClick={onClose}
						aria-label="Close settings"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
						>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</button>
				</header>

				<div className="settingsTabs" role="tablist">
					{(["general", "about"] as const).map((tab) => (
						<button
							key={tab}
							type="button"
							className={`settingsTab ${activeTab === tab ? "settingsTab--active" : ""}`}
							role="tab"
							aria-selected={activeTab === tab}
							onClick={() => setActiveTab(tab)}
						>
							{tab === "general" ? "General" : "About"}
						</button>
					))}
				</div>

				<div className="settingsBody">
					{activeTab === "general" ? (
						<section className="settingsSection">
							<div className="settingsSection__intro">
								<div className="appBadge">
									<img
										className="appBadge__icon"
										src={APP_ICON}
										alt=""
										width={68}
										height={68}
									/>
									<div>
										<h2>{appInfo.name}</h2>
										<p>Core application preferences and maintenance actions.</p>
									</div>
								</div>
							</div>

							<div className="settingsGroup">
								<div className="settingsGroup__label">Software Update</div>
								<div className="settingsCard settingsCard--stack">
									<div className="settingsAction">
										<div>
											<strong>Check for Updates</strong>
											<p>Run a manual update check for the current app.</p>
										</div>
										<button
											type="button"
											className="primaryBtn"
											onClick={() => {
												if (onCheckUpdates) onCheckUpdates();
												else void openUrl(appInfo.releasesUrl);
												onClose();
											}}
										>
											Check Now
										</button>
									</div>
									<div className="settingsAction">
										<div>
											<strong>Release Notes</strong>
											<p>
												Open the latest shipped release details in your browser.
											</p>
										</div>
										<button
											type="button"
											className="secondaryBtn"
											onClick={() => void openUrl(appInfo.releasesUrl)}
										>
											Open Releases
										</button>
									</div>
								</div>
							</div>

							<div className="settingsGroup">
								<div className="settingsGroup__label">Support</div>
								<div className="settingsCard settingsCard--stack">
									<div className="settingsAction">
										<div>
											<strong>Report an Issue</strong>
											<p>
												Open the issue tracker to report a bug or request a
												feature.
											</p>
										</div>
										<button
											type="button"
											className="secondaryBtn"
											onClick={() => void openUrl(appInfo.issuesUrl)}
										>
											Open GitHub
										</button>
									</div>
									<div className="settingsAction">
										<div>
											<strong>Support Development</strong>
											<p>Help fund maintenance and future improvements.</p>
										</div>
										<button
											type="button"
											className="secondaryBtn"
											onClick={() => void openUrl(DONATE_URL)}
										>
											Buy Me a Coffee
										</button>
									</div>
								</div>
							</div>
						</section>
					) : (
						<section className="settingsSection">
							<div className="aboutHero">
								<img
									className="aboutHero__icon"
									src={APP_ICON}
									alt={`${appInfo.name} icon`}
									width={96}
									height={96}
								/>
								<h2 className="aboutHero__name">{appInfo.name}</h2>
								<p className="aboutHero__version">Version {appInfo.version}</p>
								<p className="aboutHero__desc">{appInfo.description}</p>
								<p className="aboutHero__copy">{appInfo.copyright}</p>
							</div>

							<div className="settingsGroup">
								<div className="settingsGroup__label">App Info</div>
								<div className="settingsCard settingsCard--table">
									{appRows.map((row) => (
										<div className="infoRow" key={row.label}>
											<span>{row.label}</span>
											<strong>{row.value}</strong>
										</div>
									))}
								</div>
							</div>

							<div className="settingsGroup">
								<div className="settingsGroup__label">Links</div>
								<div className="settingsCard settingsCard--stack">
									<div className="settingsAction">
										<div>
											<strong>Website</strong>
											<p>
												Visit the product page for updates and documentation.
											</p>
										</div>
										<button
											type="button"
											className="secondaryBtn"
											onClick={() => void openUrl(appInfo.homepage)}
										>
											Open Website
										</button>
									</div>
									<div className="settingsAction">
										<div>
											<strong>Repository</strong>
											<p>Browse the project source and development history.</p>
										</div>
										<button
											type="button"
											className="secondaryBtn"
											onClick={() => void openUrl(appInfo.repositoryUrl)}
										>
											Open GitHub
										</button>
									</div>
									<div className="settingsAction">
										<div>
											<strong>Support Development</strong>
											<p>Help fund maintenance and future improvements.</p>
										</div>
										<button
											type="button"
											className="secondaryBtn"
											onClick={() => void openUrl(DONATE_URL)}
										>
											Buy Me a Coffee
										</button>
									</div>
								</div>
							</div>
						</section>
					)}
				</div>
			</div>
		</div>
	);
}
