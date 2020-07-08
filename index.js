const util = require("util");
const { app, BrowserWindow, Menu, screen, Tray } = require("electron");
const exec = util.promisify(require("child_process").exec);

async function globalPackages() {
  let yarn = await yarnPackages();
  let npm = await npmPackages();
  let pnpm = await pnpmPackages();
  console.log({
    yarn,
    npm,
    pnpm,
  });
}
async function yarnPackages() {
  try {
    const { stdout } = await exec("yarn -v");
    return stdout;
  } catch (err) {
    return false;
  }
}
async function npmPackages() {
  try {
    const { stdout } = await exec("npm -v");
    return stdout;
  } catch (err) {
    return false;
  }
}
async function pnpmPackages() {
  try {
    const { stdout } = await exec("pnpm -v");
    return stdout;
  } catch (err) {
    return false;
  }
}

globalPackages();

require("electron-reload")(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`),
});

const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  window = new BrowserWindow({
    title: "npMax",
    titleBarStyle: "hiddenInset",
    transparent: true,
    frame: false,
    vibrancy: "sidebar",
    width: width / 1.25,
    height: height / 1.25,
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
    },
  });

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

let appIcon = null;
let window = null;

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("ready", () => {
  appIcon = new Tray("public/favicon.png");

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

  // if (process.platform === "darwin") {
  //   var template = [
  //     {
  //       label: "FromScratch",
  //       submenu: [
  //         {
  //           label: "Quit",
  //           accelerator: "CmdOrCtrl+Q",
  //           click: function () {
  //             app.quit();
  //           },
  //         },
  //       ],
  //     },
  //     {
  //       label: "Edit",
  //       submenu: [
  //         {
  //           label: "Undo",
  //           accelerator: "CmdOrCtrl+Z",
  //           selector: "undo:",
  //         },
  //         {
  //           label: "Redo",
  //           accelerator: "Shift+CmdOrCtrl+Z",
  //           selector: "redo:",
  //         },
  //         {
  //           type: "separator",
  //         },
  //         {
  //           label: "Cut",
  //           accelerator: "CmdOrCtrl+X",
  //           selector: "cut:",
  //         },
  //         {
  //           label: "Copy",
  //           accelerator: "CmdOrCtrl+C",
  //           selector: "copy:",
  //         },
  //         {
  //           label: "Paste",
  //           accelerator: "CmdOrCtrl+V",
  //           selector: "paste:",
  //         },
  //         {
  //           label: "Select All",
  //           accelerator: "CmdOrCtrl+A",
  //           selector: "selectAll:",
  //         },
  //       ],
  //     },
  //   ];
  //   var osxMenu = menu.buildFromTemplate(template);
  //   menu.setApplicationMenu(osxMenu);
  // }

  // const dockMenu = Menu.buildFromTemplate([
  //   {
  //     label: "New Window",
  //     click() {
  //       console.log("New Window");
  //     },
  //   },
  //   {
  //     label: "New Window with Settings",
  //     submenu: [{ label: "Basic" }, { label: "Pro" }],
  //   },
  //   { label: "New Command..." },
  // ]);

  // app.dock.setMenu(dockMenu);
});
