import { ipcMain, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const proc = spawn("python3", [path.join(__dirname$1, "../core/parse.py")], {
  stdio: ["pipe", "pipe", "pipe"]
});
const rl = createInterface({ input: proc.stdout });
async function request(payload) {
  proc.stdin.write(JSON.stringify(payload) + "\n");
  return new Promise((resolve, reject) => {
    const onLine = (line) => {
      cleanup();
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error("Invalid JSON from Python"));
      }
    };
    const onErr = (chunk) => {
      cleanup();
      reject(new Error(`Python stderr: ${chunk.toString().trim()}`));
    };
    function cleanup() {
      clearTimeout(timer);
      rl.off("line", onLine);
      proc.stderr.off("data", onErr);
    }
    rl.once("line", onLine);
    proc.stderr.once("data", onErr);
    const timer = setTimeout(() => {
      clearTimeout(timer);
      rl.off("line", onLine);
      proc.stderr.off("data", onErr);
      reject(new Error("Python response timed out"));
    }, 1e4);
  });
}
ipcMain.handle("request", async (_evt, payload) => {
  return await request(payload);
});
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let pyProc;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    minWidth: 800,
    minHeight: 600
  });
  win.maximize();
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL,
  pyProc,
  win
};
