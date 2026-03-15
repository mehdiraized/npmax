export const APP_CATALOG = [
	{
		id: "steam",
		name: "Steam",
		aliases: ["steam"],
		platforms: {
			darwin: { brewCask: "steam" },
			win32: { wingetId: "Valve.Steam" },
			linux: { flatpakId: "com.valvesoftware.Steam", snapName: "steam" },
		},
		website: "https://store.steampowered.com/about/",
	},
	{
		id: "android-studio",
		name: "Android Studio",
		aliases: ["android studio"],
		platforms: {
			darwin: { brewCask: "android-studio" },
			win32: { wingetId: "Google.AndroidStudio" },
			linux: { flatpakId: "com.google.AndroidStudio" },
		},
		website: "https://developer.android.com/studio",
	},
	{
		id: "visual-studio-code",
		name: "Visual Studio Code",
		aliases: ["visual studio code", "code", "vscode"],
		platforms: {
			darwin: { brewCask: "visual-studio-code" },
			win32: { wingetId: "Microsoft.VisualStudioCode" },
			linux: { flatpakId: "com.visualstudio.code", snapName: "code" },
		},
		website: "https://code.visualstudio.com/",
	},
	{
		id: "cursor",
		name: "Cursor",
		aliases: ["cursor", "cursor editor"],
		platforms: {
			darwin: { brewCask: "cursor" },
			win32: { wingetId: "Anysphere.Cursor" },
			linux: { flatpakId: "com.cursor.Cursor" },
		},
		website: "https://cursor.com/",
	},
	{
		id: "docker-desktop",
		name: "Docker Desktop",
		aliases: ["docker desktop", "docker"],
		platforms: {
			darwin: { brewCask: "docker" },
			win32: { wingetId: "Docker.DockerDesktop" },
		},
		website: "https://www.docker.com/products/docker-desktop/",
	},
	{
		id: "figma",
		name: "Figma",
		aliases: ["figma"],
		platforms: {
			darwin: { brewCask: "figma" },
			win32: { wingetId: "Figma.Figma" },
			linux: { githubRepo: "Figma-Linux/figma-linux" },
		},
		website: "https://www.figma.com/downloads/",
	},
	{
		id: "postman",
		name: "Postman",
		aliases: ["postman"],
		platforms: {
			darwin: { brewCask: "postman" },
			win32: { wingetId: "Postman.Postman" },
			linux: { snapName: "postman" },
		},
		website: "https://www.postman.com/downloads/",
	},
	{
		id: "notion",
		name: "Notion",
		aliases: ["notion"],
		platforms: {
			darwin: { brewCask: "notion" },
			win32: { wingetId: "Notion.Notion" },
			linux: { flatpakId: "notion.id" },
		},
		website: "https://www.notion.so/desktop",
	},
	{
		id: "obsidian",
		name: "Obsidian",
		aliases: ["obsidian"],
		platforms: {
			darwin: { brewCask: "obsidian" },
			win32: { wingetId: "Obsidian.Obsidian" },
			linux: { flatpakId: "md.obsidian.Obsidian" },
		},
		website: "https://obsidian.md/download",
	},
	{
		id: "slack",
		name: "Slack",
		aliases: ["slack"],
		platforms: {
			darwin: { brewCask: "slack" },
			win32: { wingetId: "SlackTechnologies.Slack" },
			linux: { flatpakId: "com.slack.Slack", snapName: "slack" },
		},
		website: "https://slack.com/downloads/",
	},
	{
		id: "discord",
		name: "Discord",
		aliases: ["discord"],
		platforms: {
			darwin: { brewCask: "discord" },
			win32: { wingetId: "Discord.Discord" },
			linux: { flatpakId: "com.discordapp.Discord", snapName: "discord" },
		},
		website: "https://discord.com/download",
	},
	{
		id: "telegram",
		name: "Telegram",
		aliases: ["telegram", "telegram desktop"],
		platforms: {
			darwin: { brewCask: "telegram" },
			win32: { wingetId: "Telegram.TelegramDesktop" },
			linux: { flatpakId: "org.telegram.desktop", snapName: "telegram-desktop" },
		},
		website: "https://desktop.telegram.org/",
	},
	{
		id: "whatsapp",
		name: "WhatsApp",
		aliases: ["whatsapp", "whatsapp desktop"],
		platforms: {
			darwin: { brewCask: "whatsapp" },
			win32: { wingetId: "WhatsApp.WhatsApp" },
		},
		website: "https://www.whatsapp.com/download",
	},
	{
		id: "spotify",
		name: "Spotify",
		aliases: ["spotify"],
		platforms: {
			darwin: { brewCask: "spotify" },
			win32: { wingetId: "Spotify.Spotify" },
			linux: { flatpakId: "com.spotify.Client", snapName: "spotify" },
		},
		website: "https://www.spotify.com/download/",
	},
	{
		id: "vlc",
		name: "VLC",
		aliases: ["vlc", "vlc media player"],
		platforms: {
			darwin: { brewCask: "vlc" },
			win32: { wingetId: "VideoLAN.VLC" },
			linux: { flatpakId: "org.videolan.VLC", snapName: "vlc" },
		},
		website: "https://www.videolan.org/vlc/",
	},
	{
		id: "firefox",
		name: "Firefox",
		aliases: ["firefox", "mozilla firefox"],
		platforms: {
			darwin: { brewCask: "firefox" },
			win32: { wingetId: "Mozilla.Firefox" },
			linux: { flatpakId: "org.mozilla.firefox", snapName: "firefox" },
		},
		website: "https://www.mozilla.org/firefox/new/",
	},
	{
		id: "google-chrome",
		name: "Google Chrome",
		aliases: ["google chrome", "chrome"],
		platforms: {
			darwin: { brewCask: "google-chrome" },
			win32: { wingetId: "Google.Chrome" },
		},
		website: "https://www.google.com/chrome/",
	},
	{
		id: "brave",
		name: "Brave",
		aliases: ["brave", "brave browser"],
		platforms: {
			darwin: { brewCask: "brave-browser" },
			win32: { wingetId: "Brave.Brave" },
			linux: { flatpakId: "com.brave.Browser" },
		},
		website: "https://brave.com/download/",
	},
	{
		id: "arc",
		name: "Arc",
		aliases: ["arc", "arc browser"],
		platforms: {
			darwin: { brewCask: "arc" },
			win32: { wingetId: "TheBrowserCompany.Arc" },
		},
		website: "https://arc.net/download",
	},
	{
		id: "1password",
		name: "1Password",
		aliases: ["1password"],
		platforms: {
			darwin: { brewCask: "1password" },
			win32: { wingetId: "AgileBits.1Password" },
			linux: { flatpakId: "com.onepassword.OnePassword" },
		},
		website: "https://1password.com/downloads",
	},
	{
		id: "zoom",
		name: "Zoom",
		aliases: ["zoom", "zoom workplace"],
		platforms: {
			darwin: { brewCask: "zoom" },
			win32: { wingetId: "Zoom.Zoom" },
			linux: { flatpakId: "us.zoom.Zoom" },
		},
		website: "https://zoom.us/download",
	},
];

const normalize = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

export const findCatalogEntry = (name) => {
	const normalized = normalize(name);
	return APP_CATALOG.find((entry) =>
		[entry.name, ...(entry.aliases || [])]
			.map((item) => normalize(item))
			.some(
				(alias) =>
					alias === normalized ||
					normalized.includes(alias) ||
					alias.includes(normalized),
			),
	);
};
