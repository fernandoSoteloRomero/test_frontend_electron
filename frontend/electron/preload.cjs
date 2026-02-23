// frontend/electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("app", {
  pickAudio: () => ipcRenderer.invoke("pick-audio"),
  transcribeFile: (filePath) => ipcRenderer.invoke("transcribe-file", filePath),
});