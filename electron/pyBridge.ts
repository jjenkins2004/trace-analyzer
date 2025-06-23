import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ipcMain } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create the python process, by running the equiv of activating the virtual environment then running python3 `path/parse.py`.
// Also check if the virtual environment is created because we use that python binary to execute our process, that way we have installed modules
// The pipe, pipe, pipe stuff creates pipes between the python stdIOs with our stdIOs
const pythonExe =
  process.platform === "win32"
    ? path.join(__dirname, "..", "core", ".venv", "Scripts", "python.exe")
    : path.join(__dirname, "..", "core", ".venv", "bin", "python");
import fs from "fs";
if (!fs.existsSync(pythonExe)) {
  throw new Error(
    `Python executable not found at ${pythonExe}. Create a python virtual environment named '.venv' in the core folder, and install requirements.txt`
  );
}
const proc = spawn(pythonExe, [path.join(__dirname, "../core/parse.py")], {
  stdio: ["pipe", "pipe", "pipe"],
});

// Create a readline interface on proc.stdout (where our python process will write to),
// which makes sure what we get is the full message until a '\n'
const rl = createInterface({ input: proc.stdout });

// Create an interface for requesting with a payload and awaiting the response
export async function request(payload: object) {
  // Write our payload to the python process
  proc.stdin.write(JSON.stringify(payload) + "\n");

  // Return an unresolved promise which will either reject or resolve
  // based on the response of our python process
  return new Promise((resolve, reject) => {
    // Define our action on receiving a line
    const onLine = (line: string) => {
      cleanup();
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error("Invalid JSON from Python"));
      }
    };

    // Handle content written to stderr
    const onErr = (chunk: Buffer) => {
      cleanup();
      reject(new Error(`Python stderr: ${chunk.toString().trim()}`));
    };

    // Cleanup both listeners & timer
    function cleanup() {
      clearTimeout(timer);
      rl.off("line", onLine);
      proc.stderr.off("data", onErr);
    }

    // Create one-shot listeners
    rl.once("line", onLine);
    proc.stderr.once("data", onErr);

    // Timeout handler
    const timer = setTimeout(() => {
      clearTimeout(timer);
      rl.off("line", onLine);
      proc.stderr.off("data", onErr);
      reject(new Error("Python response timed out"));
    }, 10000);
  });
}

// Expose an api that our renderer can invoke
ipcMain.handle("request", async (_evt, payload) => {
  return await request(payload);
});
