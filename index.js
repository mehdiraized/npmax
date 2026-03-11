const {
	app,
	BrowserWindow,
	Menu,
	screen,
	Tray,
	dialog,
	ipcMain,
	shell,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const pkg = require("./package.json");

let appIcon = null;
let window = null;
let updateDownloadInProgress = false;
let isQuitting = false;
let manualUpdateCheckInProgress = false;

const APP_NAME = pkg.build?.productName || "npMax";
const APP_VERSION = app.getVersion();
const GITHUB_URL = pkg.github || "https://github.com/mehdiraized/npmax";
const ISSUES_URL = pkg.bugs?.url || `${GITHUB_URL}/issues`;
const RELEASES_URL = `${GITHUB_URL}/releases`;
const isMacManualUpdateOnly = process.platform === "darwin";
const REPOSITORY_URL =
	typeof pkg.repository?.url === "string"
		? pkg.repository.url.replace(/\.git$/, "")
		: GITHUB_URL;

const sendToWindow = (channel, payload) => {
	if (!window || window.isDestroyed()) return;
	window.webContents.send(channel, payload);
};

const focusMainWindow = () => {
	if (!window || window.isDestroyed()) {
		createWindow();
		return;
	}

	if (window.isMinimized()) {
		window.restore();
	}
	window.show();
	window.focus();
};

const openExternalUrl = async (url) => {
	try {
		await shell.openExternal(url);
	} catch (err) {
		console.error(`Failed to open external URL (${url}):`, err);
	}
};

const createWindow = () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;
	const { platform } = process;

	const baseConfig = {
		title: "npMax",
		frame: false,
		width: Math.round(width / 1.25),
		height: Math.round(height / 1.25),
		minWidth: 800,
		minHeight: 500,
		webPreferences: {
			nodeIntegration: true,
			devTools: true,
			contextIsolation: false,
		},
	};

	// Platform-specific window effects
	if (platform === "darwin") {
		// macOS: native Liquid Glass via vibrancy
		Object.assign(baseConfig, {
			titleBarStyle: "hiddenInset",
			transparent: true,
			vibrancy: "under-window",
			visualEffectState: "active",
		});
	} else if (platform === "win32") {
		// Windows 11: Acrylic/Mica effect
		Object.assign(baseConfig, {
			titleBarStyle: "hidden",
			transparent: true,
			backgroundColor: "#00000000",
			backgroundMaterial: "acrylic",
		});
	} else {
		// Linux: CSS-based glass morphism
		Object.assign(baseConfig, {
			titleBarStyle: "hidden",
			transparent: true,
			backgroundColor: "#00000000",
		});
	}

	window = new BrowserWindow(baseConfig);
	window.setMenuBarVisibility(true);

	window.on("minimize", (e) => {
		if (isQuitting) return;
		e.preventDefault();
		window.hide();
	});

	window.on("close", (e) => {
		if (isQuitting) return;
		e.preventDefault();
		isQuitting = true;
		app.quit();
	});

	window.on("closed", () => {
		window = null;
	});

	window.loadFile("public/index.html");
};

const checkForAppUpdates = async ({ manual = false } = {}) => {
	if (manual && manualUpdateCheckInProgress) return;

	manualUpdateCheckInProgress = manual;

	try {
		await autoUpdater.checkForUpdates();
	} catch (err) {
		manualUpdateCheckInProgress = false;
		console.error("Update check failed:", err.message);
		sendToWindow("update-error", {
			message: err.message,
			manual,
		});
		if (manual) {
			void dialog.showMessageBox({
				type: "error",
				buttons: ["OK", "Open Releases"],
				defaultId: 0,
				cancelId: 0,
				title: "Update Check Failed",
				message: "Unable to check for updates.",
				detail: err.message,
			}).then(({ response }) => {
				if (response === 1) {
					void openExternalUrl(RELEASES_URL);
				}
			});
		}
	}
};

const buildAppMenu = () => {
	const isMac = process.platform === "darwin";
	const editSubmenu = [
		{ role: "undo" },
		{ role: "redo" },
		{ type: "separator" },
		{ role: "cut" },
		{ role: "copy" },
		{ role: "paste" },
	];

	if (isMac) {
		editSubmenu.push({ role: "pasteAndMatchStyle" });
	}

	editSubmenu.push({ role: "delete" }, { role: "selectAll" });

	const template = [];

	if (isMac) {
		template.push({
			label: APP_NAME,
			submenu: [
				{ role: "about", label: `About ${APP_NAME}` },
				{ type: "separator" },
				{
					label: "Check for Updates...",
					accelerator: "CmdOrCtrl+Shift+U",
					click: () => {
						void checkForAppUpdates({ manual: true });
					},
				},
				{ type: "separator" },
				{
					label: "GitHub Repository",
					click: () => {
						void openExternalUrl(REPOSITORY_URL);
					},
				},
				{
					label: "Report an Issue",
					click: () => {
						void openExternalUrl(ISSUES_URL);
					},
				},
				{
					label: "Release Notes",
					click: () => {
						void openExternalUrl(RELEASES_URL);
					},
				},
				{ type: "separator" },
				{ role: "services" },
				{ type: "separator" },
				{ role: "hide" },
				{ role: "hideOthers" },
				{ role: "unhide" },
				{ type: "separator" },
				{ role: "quit", label: `Quit ${APP_NAME}` },
			],
		});
	}

	template.push(
		{
			label: "File",
			submenu: [
				{
					label: "Add Project...",
					accelerator: "CmdOrCtrl+O",
					click: () => {
						sendToWindow("menu-add-project");
						focusMainWindow();
					},
				},
				{
					label: "Reload Current Project",
					accelerator: "CmdOrCtrl+Shift+R",
					click: () => {
						sendToWindow("menu-reload-current-project");
						focusMainWindow();
					},
				},
				{ type: "separator" },
				isMac ? { role: "close" } : { role: "quit" },
			],
		},
		{
			label: "Edit",
			submenu: editSubmenu,
		},
		{
			label: "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
		{
			label: "Window",
			submenu: isMac
				? [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }]
				: [{ role: "minimize" }, { role: "close" }],
		},
		{
			label: "Help",
			submenu: [
				{
					label: "Check for Updates...",
					click: () => {
						void checkForAppUpdates({ manual: true });
					},
				},
				{ type: "separator" },
				{
					label: "About npMax",
					click: () => {
						app.showAboutPanel();
					},
				},
				{
					label: `Version ${APP_VERSION}`,
					enabled: false,
				},
				{ type: "separator" },
				{
					label: "GitHub Repository",
					click: () => {
						void openExternalUrl(REPOSITORY_URL);
					},
				},
				{
					label: "Report an Issue",
					click: () => {
						void openExternalUrl(ISSUES_URL);
					},
				},
				{
					label: "Latest Releases",
					click: () => {
						void openExternalUrl(RELEASES_URL);
					},
				},
			],
		},
	);

	return Menu.buildFromTemplate(template);
};

ipcMain.handle("show-open-dialog", async () => {
	const result = await dialog.showOpenDialog(window, {
		properties: ["openDirectory"],
	});
	return result.filePaths;
});

ipcMain.on("download-update", async () => {
	if (isMacManualUpdateOnly) {
		await openExternalUrl(RELEASES_URL);
		return;
	}

	if (updateDownloadInProgress) return;
	updateDownloadInProgress = true;
	try {
		await autoUpdater.downloadUpdate();
	} catch (err) {
		updateDownloadInProgress = false;
		sendToWindow(
			"update-error",
			err instanceof Error ? err.message : String(err),
		);
	}
});

ipcMain.on("install-update", () => {
	autoUpdater.quitAndInstall();
});

ipcMain.on("check-for-updates", () => {
	void checkForAppUpdates({ manual: true });
});

ipcMain.on("open-releases-page", () => {
	void openExternalUrl(RELEASES_URL);
});

function setupAutoUpdater() {
	autoUpdater.autoDownload = false;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("checking-for-update", () => {
		sendToWindow("checking-for-update", {
			manual: manualUpdateCheckInProgress,
		});
	});

	autoUpdater.on("update-available", (info) => {
		updateDownloadInProgress = false;
		if (manualUpdateCheckInProgress) {
			focusMainWindow();
		}
		sendToWindow("update-available", {
			...info,
			manualDownloadOnly: isMacManualUpdateOnly,
			releasesUrl: RELEASES_URL,
		});
		manualUpdateCheckInProgress = false;
	});

	autoUpdater.on("update-not-available", (info) => {
		updateDownloadInProgress = false;
		sendToWindow("update-not-available", {
			info,
			manual: manualUpdateCheckInProgress,
		});
		if (manualUpdateCheckInProgress) {
			void dialog.showMessageBox({
				type: "info",
				buttons: ["OK"],
				defaultId: 0,
				title: "npMax is Up to Date",
				message: `You're running the latest version of ${APP_NAME}.`,
				detail: `Current version: ${APP_VERSION}`,
			});
		}
		manualUpdateCheckInProgress = false;
	});

	autoUpdater.on("download-progress", (progress) => {
		sendToWindow("update-download-progress", progress);
	});

	autoUpdater.on("update-downloaded", () => {
		updateDownloadInProgress = false;
		sendToWindow("update-downloaded");
	});

	autoUpdater.on("error", (err) => {
		updateDownloadInProgress = false;
		const manual = manualUpdateCheckInProgress;
		manualUpdateCheckInProgress = false;
		console.error("Auto-updater error:", err.message);
		sendToWindow("update-error", {
			message: err.message,
			manual,
		});
	});

	// Check for updates 5 seconds after startup
	setTimeout(() => {
		void checkForAppUpdates();
	}, 5000);
}

app.whenReady().then(() => {
	app.setAboutPanelOptions({
		applicationName: APP_NAME,
		applicationVersion: APP_VERSION,
		version: APP_VERSION,
		copyright: pkg.build?.copyright || pkg.copyright,
		website: REPOSITORY_URL,
		credits: `GitHub: ${REPOSITORY_URL}\nIssues: ${ISSUES_URL}`,
	});

	createWindow();
	Menu.setApplicationMenu(buildAppMenu());

	setupAutoUpdater();

	appIcon = new Tray(`${__dirname}/public/favicon.png`);

	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Show",
			click: () => {
				focusMainWindow();
			},
		},
		{
			label: "Check for Updates...",
			click: () => {
				void checkForAppUpdates({ manual: true });
			},
		},
		{
			label: "Report an Issue",
			click: () => {
				void openExternalUrl(ISSUES_URL);
			},
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				isQuitting = true;
				app.quit();
			},
		},
	]);
	appIcon.setContextMenu(contextMenu);
	appIcon.setToolTip(`${APP_NAME} ${APP_VERSION}`);
});

app.on("before-quit", () => {
	isQuitting = true;
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("window-all-closed", () => app.quit());
