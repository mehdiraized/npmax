const {
	app,
	BrowserWindow,
	Menu,
	screen,
	Tray,
	dialog,
	ipcMain,
} = require("electron");
const { autoUpdater } = require("electron-updater");

let appIcon = null;
let window = null;
let updateDownloadInProgress = false;
let isQuitting = false;

const sendToWindow = (channel, payload) => {
	if (!window || window.isDestroyed()) return;
	window.webContents.send(channel, payload);
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

ipcMain.handle("show-open-dialog", async () => {
	const result = await dialog.showOpenDialog(window, {
		properties: ["openDirectory"],
	});
	return result.filePaths;
});

ipcMain.on("download-update", async () => {
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

function setupAutoUpdater() {
	autoUpdater.autoDownload = false;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("update-available", (info) => {
		updateDownloadInProgress = false;
		sendToWindow("update-available", info);
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
		console.error("Auto-updater error:", err.message);
		sendToWindow("update-error", err.message);
	});

	// Check for updates 5 seconds after startup
	setTimeout(() => {
		autoUpdater.checkForUpdates().catch((err) => {
			console.error("Update check failed:", err.message);
		});
	}, 5000);
}

app.whenReady().then(() => {
	createWindow();

	setupAutoUpdater();

	appIcon = new Tray(`${__dirname}/public/favicon.png`);

	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Show",
			click: () => {
				if (!window || window.isDestroyed()) {
					createWindow();
					return;
				}
				window.show();
			},
		},
		{
			label: "Quit",
			click: () => {
				isQuitting = true;
				app.quit();
			},
		},
	]);
	appIcon.setContextMenu(contextMenu);
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
