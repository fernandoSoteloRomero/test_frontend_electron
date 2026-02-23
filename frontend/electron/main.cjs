// frontend/electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function getBackendCommand() {
  if (isDev) {
    return {
      cmd: "/opt/homebrew/bin/python3.11",
      args: [
        path.join(
          __dirname,
          "..",
          "backend_transcripcion",
          "whisper_transcribe.py",
        ),
      ],
      env: {},
    };
  }

  // En app empaquetada (Windows): resourcesPath apunta al directorio de recursos
  const backendExe = path.join(
    process.resourcesPath,
    "backend",
    "whisper_backend.exe",
  );

  const ffmpegExe = path.join(
    process.resourcesPath,
    "ffmpeg",
    "ffmpeg.exe",
  );

  return {
    cmd: backendExe,
    args: [],
    env: { FFMPEG_BIN: ffmpegExe },
  };
}

ipcMain.handle("pick-audio", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Audio", extensions: ["mp3", "m4a", "wav", "ogg", "opus"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("transcribe-file", async (_evt, filePath) => {
  if (!filePath) return { ok: false, error: "No file selected" };

  const backend = getBackendCommand();

  return await new Promise((resolve) => {
    const child = spawn(backend.cmd, [...backend.args, filePath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...backend.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          error: `Backend exited with code ${code}`,
          stderr,
          stdout,
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (_e) {
        resolve({
          ok: false,
          error: "Failed to parse backend output as JSON",
          stdout,
          stderr,
        });
      }
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});