const {
	app,
	BrowserWindow,
	Menu,
	screen,
	Tray,
	dialog,
	ipcMain,
} = require("electron");

let appIcon = null;
let window = null;

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
		e.preventDefault();
		window.hide();
	});

	window.on("close", (e) => {
		e.preventDefault();
		window.destroy();
		app.quit();
	});

	window.loadFile("public/index.html");
};

ipcMain.handle("show-open-dialog", async () => {
	const result = await dialog.showOpenDialog(window, {
		properties: ["openDirectory"],
	});
	return result.filePaths;
});

app.whenReady().then(() => {
	createWindow();

	appIcon = new Tray(`${__dirname}/public/favicon.png`);

	const contextMenu = Menu.buildFromTemplate([
		{ label: "Show", click: () => window.show() },
		{
			label: "Quit",
			click: () => {
				window.destroy();
				app.quit();
			},
		},
	]);
	appIcon.setContextMenu(contextMenu);
});

app.on("window-all-closed", () => app.quit());
