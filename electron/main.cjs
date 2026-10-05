const { app, BrowserWindow, dialog, Menu, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");

const isDevelopment = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Pausa",
    width: 1120,
    height: 800,
    minWidth: 780,
    minHeight: 680,
    center: true,
    show: false,
    backgroundColor: "#e7ebe6",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDevelopment) {
    const port = process.env.PORT || "8443";
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || `http://localhost:${port}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showUpdateDialog(options) {
  return mainWindow
    ? dialog.showMessageBox(mainWindow, options)
    : dialog.showMessageBox(options);
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", async (updateInfo) => {
    const result = await showUpdateDialog({
      type: "info",
      title: "Actualización disponible",
      message: `Pausa ${updateInfo.version} está disponible`,
      detail: "¿Quieres descargarla ahora? Podrás seguir usando Pausa mientras se descarga.",
      buttons: ["Descargar", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate().catch((error) => {
        console.error("No se pudo descargar la actualización:", error);
      });
    }
  });

  autoUpdater.on("download-progress", ({ percent }) => {
    mainWindow?.setProgressBar(percent / 100);
  });

  autoUpdater.on("update-downloaded", async (updateInfo) => {
    mainWindow?.setProgressBar(-1);

    const result = await showUpdateDialog({
      type: "info",
      title: "Actualización lista",
      message: `Pausa ${updateInfo.version} se ha descargado`,
      detail: "Reinicia Pausa para instalar la actualización. Tus datos y sesiones se conservarán.",
      buttons: ["Reiniciar e instalar", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    mainWindow?.setProgressBar(-1);
    console.error("Error al buscar actualizaciones:", error);
  });

  autoUpdater.checkForUpdates().catch((error) => {
    console.error("No se pudo comprobar si hay actualizaciones:", error);
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.pausa.focus");
  Menu.setApplicationMenu(null);
  createWindow();

  if (!isDevelopment) {
    mainWindow.once("ready-to-show", configureAutoUpdater);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
